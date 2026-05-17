import type { NextFunction, Request, Response } from 'express'
import { Forbidden, Unauthorized } from '@/lib/errors'
import { type AccessTokenPayload, type GuestTokenPayload, verifyAccess, verifyGuest } from '@/lib/jwt'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?:     AccessTokenPayload
      guestOtp?: GuestTokenPayload
    }
  }
}

function extractToken(req: Request): string | null {
  const fromCookie = req.cookies?.access_token
  if (fromCookie) return fromCookie
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) return next(Unauthorized('auth.token_missing'))
  try {
    req.user = verifyAccess(token)
    return next()
  } catch {
    return next(Unauthorized('auth.token_invalid'))
  }
}

export function requireRole(...roles: Array<'customer' | 'staff' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized('auth.token_missing'))
    if (!roles.includes(req.user.role)) return next(Forbidden('auth.role_insufficient'))
    return next()
  }
}

/**
 * Đặt `req.user` nếu có access token hợp lệ, KHÔNG fail nếu thiếu/sai token.
 * Dùng cho endpoint cho phép cả customer (JWT) lẫn guest (qua middleware khác).
 */
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) return next()
  try {
    req.user = verifyAccess(token)
  } catch {
    // ignore — endpoint sẽ tự quyết định có cần auth hay không
  }
  return next()
}

/**
 * Đặt `req.guestOtp` nếu header `X-Guest-Token` hợp lệ. KHÔNG fail nếu thiếu.
 * Dùng cùng `requireAuthOrGuest` để chấp nhận 1 trong 2.
 */
export function attachGuestIfPresent(req: Request, _res: Response, next: NextFunction) {
  const tok = req.headers['x-guest-token']
  if (typeof tok !== 'string' || tok.length === 0) return next()
  try {
    req.guestOtp = verifyGuest(tok)
  } catch {
    // ignore
  }
  return next()
}

/** Yêu cầu phải có JWT customer HOẶC guest token đã verify OTP. */
export function requireAuthOrGuest(req: Request, _res: Response, next: NextFunction) {
  if (req.user || req.guestOtp) return next()
  return next(Unauthorized('auth.token_missing'))
}
