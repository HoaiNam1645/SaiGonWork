import { env } from '@/config/env'

/**
 * Whitelist origins từ env. Trong dev cho phép mọi `localhost:*` và `127.0.0.1:*`
 * (Next dev hay nhảy port 3000 → 3001 → 5175 khi conflict). Production strict
 * theo CORS_ORIGIN — phải khớp chính xác.
 *
 * Dùng chung cho Express `cors()` và Socket.io `cors`.
 */
const ENV_ORIGINS = env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)

export function isOriginAllowed(origin: string): boolean {
  if (ENV_ORIGINS.includes(origin)) return true

  // Dev: nới cho mọi localhost:* / 127.0.0.1:* (Next chọn port động)
  if (env.NODE_ENV !== 'production') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true
  }
  return false
}

/** Callback shape cho cors lib — accept origin nếu match whitelist. */
export function corsOriginCallback(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
): void {
  // Same-origin / curl / Postman → không có header Origin → cứ cho qua
  if (!origin) return cb(null, true)
  if (isOriginAllowed(origin)) return cb(null, true)
  cb(new Error(`CORS: origin not allowed: ${origin}`))
}
