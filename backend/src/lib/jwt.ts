import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '@/config/env'

export type Role = 'customer' | 'staff' | 'admin'

export interface AccessTokenPayload {
  sub: string         // user id (stringified BigInt)
  role: Role
  email: string
}

export interface RefreshTokenPayload {
  sub: string
  tokenVersion?: number
}

export interface GuestTokenPayload {
  orderCode: string
  email: string
  type: 'guest_order'
}

export interface LookupTokenPayload {
  email: string
  type: 'guest_lookup'
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as SignOptions)
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL } as SignOptions)
}

export function signGuestToken(payload: GuestTokenPayload, ttl = '30d'): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ttl } as SignOptions)
}

export function verifyAccess(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function verifyRefresh(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

export function verifyGuest(token: string): GuestTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as GuestTokenPayload
}

export function signLookupToken(payload: LookupTokenPayload, ttl = '7d'): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ttl } as SignOptions)
}

export function verifyLookup(token: string): LookupTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as LookupTokenPayload
}
