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
})

export const env = schema.parse(process.env)
export type Env = typeof env
