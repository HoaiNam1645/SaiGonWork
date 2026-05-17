import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkSendQuota, createOtp, verifyOtp, type OtpPurpose } from '@/lib/otp'
import { renderOtpEmail } from '@/lib/emailTemplates'
import { sendMail } from '@/lib/mailer'
import { signGuestToken } from '@/lib/jwt'
import { checkDisposable } from '@/lib/emailSecurity'
import { BadRequest } from '@/lib/errors'
import { clientIp, clientUserAgent } from '@/lib/request'
import { AuditAction, logAuditAsync } from '@/lib/auditLog'
import { type Locale } from '@/i18n'

const sendableSchema = z.object({
  email: z.string().email().toLowerCase(),
  // Public chỉ cho phép 2 purpose này. `login` / `reset_password` để dành.
  purpose: z.enum(['register', 'guest_checkout']),
})

const verifySchema = z.object({
  email:   z.string().email().toLowerCase(),
  purpose: z.enum(['register', 'guest_checkout']),
  code:    z.string().regex(/^\d{6}$/),
})


/** POST /api/otp/send */
export async function send(req: Request, res: Response) {
  const { email, purpose } = sendableSchema.parse(req.body)
  const ip        = clientIp(req)
  const userAgent = clientUserAgent(req)

  const disposable = await checkDisposable(email)
  if (disposable.isDisposable) {
    logAuditAsync({
      action:     AuditAction.EMAIL_DISPOSABLE,
      entityType: 'auth',
      diff:       { endpoint: 'otp_send', email, purpose, source: disposable.source },
      ipAddress:  ip,
    })
    throw BadRequest('auth.email_disposable', 'DISPOSABLE_EMAIL')
  }

  await checkSendQuota(email, purpose as OtpPurpose, ip)
  const { code, expiresAt } = await createOtp({
    email,
    purpose:   purpose as OtpPurpose,
    ipAddress: ip,
    userAgent,
  })

  const mail = renderOtpEmail(req.locale as Locale, code)
  await sendMail({ to: email, subject: mail.subject, text: mail.text, html: mail.html })

  res.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
    cooldownSeconds: 60,
  })
}

/** POST /api/otp/verify */
export async function verify(req: Request, res: Response) {
  const { email, purpose, code } = verifySchema.parse(req.body)

  await verifyOtp({ email, purpose: purpose as OtpPurpose, code, ip: clientIp(req) })

  // Side-effects theo purpose
  if (purpose === 'register') {
    // Đánh dấu email verified (nếu user tồn tại — register flow tạo user trước đó)
    await prisma.user.updateMany({
      where: { email, emailVerifiedAt: null },
      data:  { emailVerifiedAt: new Date() },
    })
    return res.json({ ok: true })
  }

  if (purpose === 'guest_checkout') {
    // Cấp guest token TTL 30 phút cho client dùng khi tạo đơn ngay sau đó.
    // Khi order tạo xong, BE cấp guest token vĩnh viễn theo order code.
    const guestToken = signGuestToken(
      { orderCode: 'pending', email, type: 'guest_order' },
      '30m',
    )
    return res.json({ ok: true, guestToken })
  }

  return res.json({ ok: true })
}
