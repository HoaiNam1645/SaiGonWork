import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BadRequest, Forbidden, Unauthorized } from '@/lib/errors'
import { signAccessToken, signRefreshToken, verifyRefresh } from '@/lib/jwt'
import { clearAuthCookies, setAuthCookies } from '@/lib/cookies'
import { checkSendQuota, createOtp } from '@/lib/otp'
import { renderOtpEmail } from '@/lib/emailTemplates'
import { sendMail } from '@/lib/mailer'
import { checkDisposable, tripsHoneypot } from '@/lib/emailSecurity'
import { clientIp, clientUserAgent, getClientInfo } from '@/lib/request'
import { AuditAction, logAuditAsync, withClientContext } from '@/lib/auditLog'
import { type Locale } from '@/i18n'

// -------------------- schemas --------------------

// Normalize phone: bỏ space, dash, ngoặc trước khi validate ("+49 69 1234 5678" → "+496912345678")
const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })

const passwordSchema = z
  .string()
  .min(8,           { message: 'validation.password_weak' })
  .regex(/[A-Za-z]/,{ message: 'validation.password_weak' })
  .regex(/[0-9]/,   { message: 'validation.password_weak' })

const registerSchema = z.object({
  email:    z.string().email({ message: 'validation.email_format' }).toLowerCase(),
  password: passwordSchema,
  fullName: z.string().trim().min(2, { message: 'validation.required' }).max(100),
  phone:    phoneSchema.optional(),
  // Honeypot — frontend luôn để rỗng. Bot fill mọi field sẽ tự lộ.
  website:  z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email({ message: 'validation.email_format' }).toLowerCase(),
  password: z.string().min(1, { message: 'validation.required' }),
})

const changeEmailSchema = z.object({
  email: z.string().email({ message: 'validation.email_format' }).toLowerCase(),
})

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'validation.required' }).max(100).optional(),
  // Cho phép null/empty string để clear phone
  phone:    z.union([phoneSchema, z.literal(''), z.null()]).optional(),
})

// -------------------- helpers --------------------

function userPublic(u: {
  id: bigint
  email: string
  fullName: string
  phone?: string | null
  role: 'customer' | 'staff' | 'admin'
  emailVerifiedAt?: Date | null
}) {
  return {
    id:        u.id.toString(),
    email:     u.email,
    fullName:  u.fullName,
    phone:     u.phone ?? null,
    role:      u.role,
    emailVerifiedAt: u.emailVerifiedAt ?? null,
  }
}

// -------------------- handlers --------------------

export async function register(req: Request, res: Response) {
  const client = getClientInfo(req)
  const reqIp  = client.ip

  // Honeypot — silently treat as 400 không tiết lộ lý do để bot không học pattern
  if (tripsHoneypot(req.body)) {
    logAuditAsync({
      action:     AuditAction.HONEYPOT,
      entityType: 'auth',
      diff:       withClientContext(
        { endpoint: 'register', email: req.body?.email, honeypot_value: req.body?.website },
        client,
      ),
      ipAddress:  reqIp,
    })
    throw BadRequest('auth.suspicious_request', 'SUSPICIOUS')
  }

  const body = registerSchema.parse(req.body)

  const disposable = await checkDisposable(body.email)
  if (disposable.isDisposable) {
    logAuditAsync({
      action:     AuditAction.EMAIL_DISPOSABLE,
      entityType: 'auth',
      diff:       withClientContext(
        { endpoint: 'register', email: body.email, source: disposable.source },
        client,
      ),
      ipAddress:  reqIp,
    })
    throw BadRequest('auth.email_disposable', 'DISPOSABLE_EMAIL')
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })

  // Validate password (recovery) hoặc throw collision NGAY, trước khi check quota.
  // Recovery flow: email đã có user chưa verify + password khớp → resume.
  // Mismatch password vẫn báo email_taken để không leak sự tồn tại của tài khoản.
  if (existing) {
    if (existing.emailVerifiedAt) {
      throw BadRequest('auth.email_taken', 'EMAIL_TAKEN')
    }
    const passwordOk =
      existing.passwordHash && (await bcrypt.compare(body.password, existing.passwordHash))
    if (!passwordOk) {
      throw BadRequest('auth.email_taken', 'EMAIL_TAKEN')
    }
  }

  // Pre-check OTP quota TRƯỚC khi tạo user — nếu hit rate limit thì fail nhanh,
  // không tạo orphan user trong DB. Throw 429 → frontend hiển thị error ở register page.
  const reqUa = clientUserAgent(req)
  await checkSendQuota(body.email, 'register', reqIp)

  if (existing) {
    // Recovery — user đã có sẵn, chỉ cần re-issue cookies + gửi OTP mới
    const access  = signAccessToken({ sub: existing.id.toString(), role: existing.role, email: existing.email })
    const refresh = signRefreshToken({ sub: existing.id.toString() })
    setAuthCookies(res, access, refresh)

    const { code } = await createOtp({
      email:     existing.email,
      purpose:   'register',
      ipAddress: reqIp,
      userAgent: reqUa,
    })

    // Mail gửi best-effort — nếu fail, OTP vẫn nằm trong DB, user dùng Resend ở verify
    let resumedOtpSent = false
    try {
      const mail = renderOtpEmail((req.locale as Locale) ?? 'de', code)
      await sendMail({ to: existing.email, subject: mail.subject, text: mail.text, html: mail.html })
      resumedOtpSent = true
    } catch (e) {
      console.error('[register resume] sendMail failed:', e)
    }

    return res.status(200).json({
      user: userPublic(existing),
      otpSent: resumedOtpSent,
      resumed: true,
    })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)

  // Tạo user + address placeholder trong cùng transaction.
  // Address chứa recipient + phone từ thông tin đăng ký, line/city để trống
  // — user vào "Saved addresses" sau khi đăng nhập để bổ sung.
  const { user } = await prisma.$transaction(async tx => {
    const u = await tx.user.create({
      data: {
        email:        body.email,
        passwordHash,
        fullName:     body.fullName,
        phone:        body.phone,
        role:         'customer',
      },
    })
    if (body.phone) {
      await tx.address.create({
        data: {
          userId:     u.id,
          recipient:  body.fullName,
          phone:      body.phone,
          line:       '',          // chờ user nhập
          city:       '',          // chờ user nhập
          country:    'DE',
          isDefault:  true,
        },
      })
    }
    return { user: u }
  })

  const access  = signAccessToken({ sub: user.id.toString(), role: user.role, email: user.email })
  const refresh = signRefreshToken({ sub: user.id.toString() })
  setAuthCookies(res, access, refresh)

  // OTP đã được pre-checked quota ở trên — giờ tạo + gửi.
  // sendMail best-effort: lỗi mail không làm fail register vì user có thể Resend ở verify.
  const { code } = await createOtp({
    email:     user.email,
    purpose:   'register',
    ipAddress: reqIp,
    userAgent: reqUa,
  })
  let otpSent = false
  try {
    const mail = renderOtpEmail((req.locale as Locale) ?? 'de', code)
    await sendMail({ to: user.email, subject: mail.subject, text: mail.text, html: mail.html })
    otpSent = true
  } catch (e) {
    console.error('[register] sendMail failed:', e)
  }

  res.status(201).json({ user: userPublic(user), otpSent })
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user || !user.passwordHash) throw Unauthorized('auth.invalid_credentials')
  if (!user.isActive)              throw Unauthorized('auth.account_disabled')

  const ok = await bcrypt.compare(body.password, user.passwordHash)
  if (!ok) throw Unauthorized('auth.invalid_credentials')

  await prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  })

  const access  = signAccessToken({ sub: user.id.toString(), role: user.role, email: user.email })
  const refresh = signRefreshToken({ sub: user.id.toString() })
  setAuthCookies(res, access, refresh)

  res.json({ user: userPublic(user) })
}

export function logout(_req: Request, res: Response) {
  clearAuthCookies(res)
  res.json({ ok: true })
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refresh_token
  if (!token) throw Unauthorized('auth.token_missing')

  const payload = verifyRefresh(token)
  const user    = await prisma.user.findUnique({ where: { id: BigInt(payload.sub) } })
  if (!user || !user.isActive) throw Unauthorized('auth.token_invalid')

  const access     = signAccessToken({ sub: user.id.toString(), role: user.role, email: user.email })
  const newRefresh = signRefreshToken({ sub: user.id.toString() })
  setAuthCookies(res, access, newRefresh)
  res.json({ ok: true })
}

export async function changeEmail(req: Request, res: Response) {
  const body = changeEmailSchema.parse(req.body)

  const disposable = await checkDisposable(body.email)
  if (disposable.isDisposable) {
    logAuditAsync({
      action:     AuditAction.EMAIL_DISPOSABLE,
      entityType: 'auth',
      diff:       { endpoint: 'change_email', email: body.email, source: disposable.source },
      ipAddress:  clientIp(req),
      actorId:    req.user ? BigInt(req.user.sub) : null,
      actorRole:  req.user?.role,
    })
    throw BadRequest('auth.email_disposable', 'DISPOSABLE_EMAIL')
  }

  const userId = BigInt(req.user!.sub)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Unauthorized()

  // Endpoint này chỉ cho user CHƯA verify email — đổi email đã verify phải qua flow khác
  if (user.emailVerifiedAt) {
    throw Forbidden('auth.email_already_verified', 'ALREADY_VERIFIED')
  }

  const ip = clientIp(req)
  const ua = clientUserAgent(req)

  if (user.email !== body.email) {
    // Đổi sang email khác — check collision
    const collision = await prisma.user.findUnique({ where: { email: body.email } })
    if (collision) throw BadRequest('auth.email_taken', 'EMAIL_TAKEN')

    await prisma.$transaction(async tx => {
      // Đổi email user
      await tx.user.update({
        where: { id: userId },
        data:  { email: body.email },
      })
      // Invalidate toàn bộ OTP cũ của email cũ
      await tx.emailOtp.updateMany({
        where: { email: user.email, consumedAt: null },
        data:  { consumedAt: new Date() },
      })
      // Cập nhật contact_email của address placeholder nếu có (vẫn dùng email cũ)
      // → không cần; address có recipient + phone, không lưu email
    })

    // Re-issue cookies vì email trong JWT bị stale
    const access  = signAccessToken({ sub: user.id.toString(), role: user.role, email: body.email })
    const refresh = signRefreshToken({ sub: user.id.toString() })
    setAuthCookies(res, access, refresh)
  }

  // Gửi OTP cho email mới (hoặc resend cho cùng email)
  try {
    await checkSendQuota(body.email, 'register', ip)
    const { code } = await createOtp({
      email:     body.email,
      purpose:   'register',
      ipAddress: ip,
      userAgent: ua,
    })
    const mail = renderOtpEmail((req.locale as Locale) ?? 'de', code)
    await sendMail({ to: body.email, subject: mail.subject, text: mail.text, html: mail.html })
  } catch (e) {
    console.error('[changeEmail] send OTP failed:', e)
  }

  res.json({ ok: true, email: body.email })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where:  { id: BigInt(req.user!.sub) },
    select: {
      id: true, email: true, fullName: true, phone: true, role: true, emailVerifiedAt: true,
    },
  })
  if (!user) throw Unauthorized()
  res.json({ user: userPublic(user) })
}

export async function updateProfile(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const body = updateProfileSchema.parse(req.body)

  // Loại field undefined để Prisma không update không cần thiết
  const data: { fullName?: string; phone?: string | null } = {}
  if (body.fullName !== undefined) data.fullName = body.fullName
  if (body.phone    !== undefined) data.phone    = body.phone === '' ? null : body.phone

  if (Object.keys(data).length === 0) {
    throw BadRequest('validation.required', 'NO_FIELDS')
  }

  const user = await prisma.user.update({
    where:  { id: userId },
    data,
    select: {
      id: true, email: true, fullName: true, phone: true, role: true, emailVerifiedAt: true,
    },
  })
  res.json({ user: userPublic(user) })
}
