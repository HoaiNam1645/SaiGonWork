import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { env } from '@/config/env'
import { BadRequest, TooManyReq } from '@/lib/errors'
import { AuditAction, logAuditAsync } from '@/lib/auditLog'

const OTP_LENGTH = 6

export type OtpPurpose = 'guest_checkout' | 'login' | 'register' | 'reset_password'

/** Sinh OTP 6 chữ số dùng `crypto.randomInt` để chống bias. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0')
}

/**
 * Anti-spam multi-layer cho send OTP. Mỗi violation đều được ghi vào `audit_logs`
 * trước khi throw để admin có toàn cảnh hoạt động đáng ngờ.
 */
export async function checkSendQuota(
  email: string,
  purpose: OtpPurpose,
  ip?: string | null,
) {
  const now         = new Date()
  const cooldownAgo = new Date(now.getTime() - env.OTP_RESEND_COOLDOWN_SECONDS * 1000)
  const win15Min    = new Date(now.getTime() - 15 * 60_000)
  const win1Hour    = new Date(now.getTime() - 60 * 60_000)

  // 1) Cooldown
  const last = await prisma.emailOtp.findFirst({
    where:   { email, purpose, createdAt: { gte: cooldownAgo } },
    orderBy: { createdAt: 'desc' },
    select:  { createdAt: true },
  })
  if (last) {
    const remaining =
      env.OTP_RESEND_COOLDOWN_SECONDS -
      Math.floor((now.getTime() - last.createdAt.getTime()) / 1000)
    logAuditAsync({
      action:     AuditAction.OTP_COOLDOWN,
      entityType: 'email_otp',
      diff:       { email, purpose, remaining_seconds: Math.max(1, remaining) },
      ipAddress:  ip,
    })
    throw TooManyReq('otp.cooldown', 'OTP_COOLDOWN', { seconds: Math.max(1, remaining) })
  }

  // 2) Per-email rate limit (15 phút)
  const recentCount = await prisma.emailOtp.count({
    where: { email, purpose, createdAt: { gte: win15Min } },
  })
  if (recentCount >= env.OTP_RATE_LIMIT_PER_15MIN) {
    logAuditAsync({
      action:     AuditAction.OTP_RATE_LIMIT,
      entityType: 'email_otp',
      diff:       { email, purpose, recent_count: recentCount, limit: env.OTP_RATE_LIMIT_PER_15MIN },
      ipAddress:  ip,
    })
    throw TooManyReq('otp.rate_limit', 'OTP_RATE_LIMIT')
  }

  // 3+4) IP-based — dev nới lỏng để test thoải mái
  if (ip) {
    const isDev        = env.NODE_ENV !== 'production'
    const comboMax     = isDev ? 50  : env.OTP_IP_EMAIL_COMBO_MAX_PER_HOUR
    const diversityMax = isDev ? 100 : env.OTP_IP_MAX_DISTINCT_EMAILS_PER_HOUR

    const comboCount = await prisma.emailOtp.count({
      where: { ipAddress: ip, email, createdAt: { gte: win1Hour } },
    })
    if (comboCount >= comboMax) {
      logAuditAsync({
        action:     AuditAction.OTP_IP_EMAIL_COMBO,
        entityType: 'email_otp',
        diff:       { email, purpose, combo_count: comboCount, limit: comboMax },
        ipAddress:  ip,
      })
      throw TooManyReq('otp.ip_email_combo', 'OTP_IP_EMAIL_COMBO')
    }

    const distinct = await prisma.emailOtp.findMany({
      where:    { ipAddress: ip, createdAt: { gte: win1Hour } },
      distinct: ['email'],
      select:   { email: true },
    })
    const willGrow = !distinct.some(d => d.email === email)
    const projected = distinct.length + (willGrow ? 1 : 0)
    if (projected > diversityMax) {
      logAuditAsync({
        action:     AuditAction.OTP_IP_DIVERSITY,
        entityType: 'email_otp',
        diff:       { email, purpose, distinct_emails: distinct.length, projected, limit: diversityMax },
        ipAddress:  ip,
      })
      throw TooManyReq('otp.ip_blocked', 'OTP_IP_BLOCKED')
    }
  }
}

/**
 * Tạo OTP mới: hash code, lưu DB, trả plain code để gửi qua email.
 * Trước khi tạo mới, invalidate OTP cũ chưa dùng để mỗi email chỉ có 1 mã active.
 */
export async function createOtp({
  email,
  purpose,
  ipAddress,
  userAgent,
}: {
  email: string
  purpose: OtpPurpose
  ipAddress?: string | null
  userAgent?: string
}): Promise<{ code: string; expiresAt: Date }> {
  await prisma.emailOtp.updateMany({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    data:  { consumedAt: new Date() },
  })

  const code      = generateOtpCode()
  const codeHash  = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000)

  await prisma.emailOtp.create({
    data: {
      email,
      purpose,
      codeHash,
      expiresAt,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      ipAddress,
      userAgent,
    },
  })

  return { code, expiresAt }
}

export interface VerifyOtpResult {
  ok: true
  otpId: bigint
}

/**
 * Verify code. Mọi nhánh thất bại đều throw HttpError + ghi audit_log.
 */
export async function verifyOtp({
  email,
  purpose,
  code,
  ip,
}: {
  email: string
  purpose: OtpPurpose
  code: string
  ip?: string | null
}): Promise<VerifyOtpResult> {
  if (!/^\d{6}$/.test(code)) {
    logAuditAsync({
      action:     AuditAction.OTP_INVALID_FORMAT,
      entityType: 'email_otp',
      diff:       { email, purpose, code_length: code.length },
      ipAddress:  ip,
    })
    throw BadRequest('otp.invalid', 'OTP_INVALID')
  }

  const otp = await prisma.emailOtp.findFirst({
    where: {
      email,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    logAuditAsync({
      action:     AuditAction.OTP_EXPIRED,
      entityType: 'email_otp',
      diff:       { email, purpose },
      ipAddress:  ip,
    })
    throw BadRequest('otp.expired', 'OTP_EXPIRED')
  }

  if (otp.attempts >= otp.maxAttempts) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } })
    logAuditAsync({
      action:     AuditAction.OTP_LOCKED,
      entityType: 'email_otp',
      entityId:   otp.id,
      diff:       { email, purpose, attempts: otp.attempts, max: otp.maxAttempts, reason: 'already_exceeded' },
      ipAddress:  ip,
    })
    throw BadRequest('otp.locked', 'OTP_LOCKED')
  }

  const match = await bcrypt.compare(code, otp.codeHash)

  if (!match) {
    const updated = await prisma.emailOtp.update({
      where: { id: otp.id },
      data:  { attempts: { increment: 1 } },
    })
    const remaining = Math.max(0, updated.maxAttempts - updated.attempts)

    logAuditAsync({
      action:     AuditAction.OTP_WRONG_CODE,
      entityType: 'email_otp',
      entityId:   otp.id,
      diff:       { email, purpose, attempts_now: updated.attempts, max: updated.maxAttempts, remaining },
      ipAddress:  ip,
    })

    if (remaining === 0) {
      await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } })
      logAuditAsync({
        action:     AuditAction.OTP_LOCKED,
        entityType: 'email_otp',
        entityId:   otp.id,
        diff:       { email, purpose, attempts: updated.attempts, max: updated.maxAttempts, reason: 'wrong_code_max' },
        ipAddress:  ip,
      })
      throw BadRequest('otp.locked', 'OTP_LOCKED')
    }
    throw BadRequest('otp.invalid', 'OTP_INVALID', { remaining })
  }

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data:  { consumedAt: new Date() },
  })

  return { ok: true, otpId: otp.id }
}
