import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@/lib/prisma'
import { Forbidden, Unauthorized } from '@/lib/errors'
import { env } from '@/config/env'

/**
 * Middleware check user có permission cụ thể không.
 *
 * Phase 1 (hiện tại): chỉ LOG + warn nếu thiếu permission, KHÔNG block request.
 * Mục đích: lúc rollout RBAC, không break existing flow trong khi admin còn đang
 * setup roles. Khi đã seed đủ role + assigned user → bật `ENFORCE_PERMISSIONS=true`
 * trong .env để middleware deny thật.
 *
 * Yêu cầu: middleware này phải dùng SAU `requireAuth` để có `req.user`.
 *
 * Cache: mỗi user permission set cache 60s trong memory để tránh query DB mỗi
 * request. Cache invalidate khi user roles thay đổi (xem permissionCache.invalidate).
 */

interface CacheEntry {
  keys:      Set<string>
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

export function invalidatePermissionCache(userId?: bigint | string) {
  if (userId == null) {
    cache.clear()
    return
  }
  cache.delete(String(userId))
}

async function loadUserPermissions(userId: bigint): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ key: string }[]>`
    SELECT DISTINCT p.key
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p       ON p.id      = rp.permission_id
    WHERE ur.user_id = ${userId}
      AND p.is_deprecated = false
  `
  return new Set(rows.map(r => r.key))
}

async function userHasPermission(userId: bigint, key: string): Promise<boolean> {
  const cacheKey = String(userId)
  const now      = Date.now()
  const cached   = cache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.keys.has(key)
  }
  const keys = await loadUserPermissions(userId)
  cache.set(cacheKey, { keys, expiresAt: now + CACHE_TTL_MS })
  return keys.has(key)
}

export function requirePermission(key: string) {
  return async function permissionCheck(req: Request, _res: Response, next: NextFunction) {
    if (!req.user) return next(Unauthorized('auth.token_missing'))
    const userId = BigInt(req.user.sub)

    try {
      const has = await userHasPermission(userId, key)

      if (has) return next()

      // Phase 1: log nhưng KHÔNG block. Bật ENFORCE_PERMISSIONS=true để deny thật.
      if (env.ENFORCE_PERMISSIONS) {
        return next(Forbidden('auth.permission_denied', 'PERMISSION_DENIED', { key }))
      }

      console.warn(
        `[permission] user=${userId} missing="${key}" — ALLOWED (ENFORCE_PERMISSIONS=false).`,
      )
      return next()
    } catch (e) {
      console.error('[permission] check failed:', e)
      // Lỗi DB → fail-safe ALLOW khi chưa enforce, DENY khi đã enforce
      if (env.ENFORCE_PERMISSIONS) {
        return next(Forbidden('auth.permission_denied', 'PERMISSION_CHECK_FAILED'))
      }
      return next()
    }
  }
}
