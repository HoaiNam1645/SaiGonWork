import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from '@/config/env'
import { apiRouter } from '@/routes'
import { errorHandler, notFoundHandler } from '@/middleware/error'
import { i18nMiddleware } from '@/i18n'
import { corsOriginCallback } from '@/lib/corsOrigin'

/** Parse env TRUST_PROXY → giá trị Express chấp nhận. */
function parseTrustProxy(v: string): number | boolean | string | string[] {
  const trimmed = v.trim()
  if (trimmed === 'false' || trimmed === '0') return false
  if (trimmed === 'true')                      return true
  const n = Number(trimmed)
  if (!Number.isNaN(n) && Number.isInteger(n)) return n
  // Comma-separated → CIDR list / keyword list (vd "loopback,linklocal,10.0.0.0/8")
  if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim()).filter(Boolean)
  return trimmed
}

export function createApp() {
  const app = express()

  // Trust X-Forwarded-* header từ proxy ngược (Nginx, Cloudflare, ...).
  // Cấu hình qua env TRUST_PROXY:
  //   '1'         → Nginx duy nhất (mặc định)
  //   '2'         → Cloudflare → Nginx
  //   'loopback'  → chỉ tin 127.*
  //   'false'/'0' → KHÔNG tin XFF (app trực tiếp, không proxy)
  //   '10.0.0.0/8,172.16.0.0/12' → CIDR list cụ thể (an toàn nhất)
  app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY))

  app.use(helmet())
  app.use(
    cors({
      origin: corsOriginCallback,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  app.use(i18nMiddleware)

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
