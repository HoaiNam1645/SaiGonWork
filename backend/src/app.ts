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

export function createApp() {
  const app = express()

  // Trust X-Forwarded-* header từ proxy ngược (Nginx, Cloudflare, ...).
  // 1 = chỉ tin 1 hop. Production sau nhiều proxy thì tăng số hoặc dùng CIDR.
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
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
