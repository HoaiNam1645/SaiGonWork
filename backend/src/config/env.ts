import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  OTP_TTL_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  OTP_RATE_LIMIT_PER_15MIN: z.coerce.number().default(3),
  OTP_IP_MAX_DISTINCT_EMAILS_PER_HOUR: z.coerce.number().default(10),
  OTP_IP_EMAIL_COMBO_MAX_PER_HOUR: z.coerce.number().default(5),

  // SMTP (Gmail, Mailgun, ...)
  MAIL_HOST:         z.string().default('smtp.gmail.com'),
  MAIL_PORT:         z.coerce.number().default(587),
  MAIL_USERNAME:     z.string().optional(),
  MAIL_PASSWORD:     z.string().optional(),
  MAIL_ENCRYPTION:   z.enum(['tls', 'ssl', 'none']).default('tls'),
  MAIL_FROM_ADDRESS: z.string().optional(),
  MAIL_FROM_NAME:    z.string().default('Sai Gon Wok'),

  // Public URL (cho link verify trong email)
  PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  // Anti-spam disposable email
  // Custom blacklist domains, ngăn cách dấu phẩy (vd "anawebs.com,foo.com")
  DISPOSABLE_EMAIL_BLACKLIST: z.string().default(''),
  // Bật DNS MX record check — domain không có MX record → reject (chậm hơn ~50-200ms)
  DISPOSABLE_CHECK_MX: z.coerce.boolean().default(false),

  OSRM_URL: z.string().default('https://router.project-osrm.org'),

  // ----- Proxy / IP detection -----
  // Số hop reverse proxy app đứng sau (Nginx=1, Cloudflare→Nginx=2, ...).
  // Hoặc dùng từ khoá: 'loopback' / 'linklocal' / 'uniquelocal' / 'false' / cidr list.
  // Xem: https://expressjs.com/en/guide/behind-proxies.html
  TRUST_PROXY: z.string().default('1'),
  // Nếu deploy sau Cloudflare → bật để dùng header CF-Connecting-IP làm canonical IP.
  TRUST_CLOUDFLARE: z.coerce.boolean().default(false),

  // ----- RBAC -----
  // Phase 1 rollout: chưa enforce permission, chỉ log warning. Bật true khi đã seed
  // đủ roles cho tất cả staff/admin user.
  ENFORCE_PERMISSIONS: z.coerce.boolean().default(false),
})

export const env = schema.parse(process.env)
export type Env = typeof env

// =====================================================================
// Production safety checks — fail fast at boot nếu config nguy hiểm
// =====================================================================
if (env.NODE_ENV === 'production') {
  const errors: string[] = []

  // URL không được trỏ về localhost trong production
  if (/(localhost|127\.0\.0\.1)/i.test(env.CORS_ORIGIN)) {
    errors.push(`CORS_ORIGIN cannot point to localhost in production: ${env.CORS_ORIGIN}`)
  }
  if (/(localhost|127\.0\.0\.1)/i.test(env.PUBLIC_APP_URL)) {
    errors.push(`PUBLIC_APP_URL cannot point to localhost in production: ${env.PUBLIC_APP_URL}`)
  }

  // SMTP bắt buộc — nếu thiếu thì OTP/order email không gửi được
  if (!env.MAIL_USERNAME || !env.MAIL_PASSWORD) {
    errors.push('MAIL_USERNAME and MAIL_PASSWORD are required in production')
  }

  // JWT secret không được dùng giá trị mặc định / quá yếu (>=32 ký tự khuyến nghị)
  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be at least 32 chars in production')
  }

  if (errors.length > 0) {
    console.error('\n[env] FATAL — production config invalid:')
    for (const e of errors) console.error('  •', e)
    console.error()
    throw new Error('Invalid production environment — see errors above')
  }
}
