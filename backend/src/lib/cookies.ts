import type { Response } from 'express'
import { env } from '@/config/env'

export const authCookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
}

const ACCESS_MAX_AGE  = 15 * 60 * 1000              // 15 phút
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000     // 7 ngày

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token',  accessToken,  { ...authCookieOpts, maxAge: ACCESS_MAX_AGE  })
  res.cookie('refresh_token', refreshToken, { ...authCookieOpts, maxAge: REFRESH_MAX_AGE })
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token',  authCookieOpts)
  res.clearCookie('refresh_token', authCookieOpts)
}
