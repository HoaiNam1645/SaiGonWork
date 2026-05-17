import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Action constants — đặt theo namespace `<category>.<event>` để admin filter dễ.
 * Dùng `as const` để tự autocomplete + tránh typo.
 */
export const AuditAction = {
  // OTP — anti-spam violations
  OTP_COOLDOWN:        'security.otp.cooldown',
  OTP_RATE_LIMIT:      'security.otp.rate_limit',
  OTP_IP_EMAIL_COMBO:  'security.otp.ip_email_combo',
  OTP_IP_DIVERSITY:    'security.otp.ip_diversity',
  OTP_INVALID_FORMAT:  'security.otp.invalid_format',
  OTP_EXPIRED:         'security.otp.expired',
  OTP_WRONG_CODE:      'security.otp.wrong_code',
  OTP_LOCKED:          'security.otp.locked',

  // Email gating
  EMAIL_DISPOSABLE:    'security.email.disposable',

  // Bot detection
  HONEYPOT:            'security.honeypot',
} as const

export type AuditActionValue = typeof AuditAction[keyof typeof AuditAction]

export interface AuditInput {
  action:      string                       // dùng AuditAction.XXX
  entityType:  string                       // 'email_otp' | 'auth' | 'user' | 'order' | ...
  entityId?:   bigint | number | null
  actorId?:    bigint | number | null
  actorRole?:  string | null
  diff?:       Record<string, unknown>      // payload chi tiết — lưu vào diff_json
  ipAddress?:  string | null
}

/**
 * Helper merge thông tin client (IP type, user agent, forwarded chain) vào diff.
 * Pass `req` để tự enrich.
 */
export function withClientContext(
  diff: Record<string, unknown> | undefined,
  client: {
    ipType?: string
    forwardedChain?: string[] | null
    userAgent?: string
    expressIp?: string
    remoteAddress?: string
  },
): Record<string, unknown> {
  return {
    ...(diff ?? {}),
    _client: {
      ip_type:         client.ipType,
      forwarded_chain: client.forwardedChain,
      user_agent:      client.userAgent,
      express_ip:      client.expressIp,
      remote_address:  client.remoteAddress,
    },
  }
}

/**
 * Ghi log audit. Không bao giờ throw — lỗi DB chỉ log console.
 * Dùng trực tiếp khi cần đợi xong (vd trong transaction).
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action:     input.action,
        entityType: input.entityType,
        entityId:   input.entityId == null ? null : BigInt(input.entityId),
        actorId:    input.actorId == null ? null : BigInt(input.actorId),
        actorRole:  input.actorRole ?? null,
        diffJson:   (input.diff ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress:  input.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('[audit_log] write failed:', e)
  }
}

/**
 * Fire-and-forget wrapper — không block request flow. Phù hợp cho audit events
 * không critical (anti-spam, security alerts) — admin xem lại sau.
 */
export function logAuditAsync(input: AuditInput): void {
  void logAudit(input)
}
