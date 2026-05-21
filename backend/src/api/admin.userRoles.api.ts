import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BadRequest, NotFound } from '@/lib/errors'
import { invalidatePermissionCache } from '@/middleware/permission'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

/**
 * GET  /api/admin/users/:id/roles  — list roles của 1 user
 * PUT  /api/admin/users/:id/roles  — replace toàn bộ roles
 */

export async function getUserRoles(req: Request, res: Response) {
  const userId = parseId(req.params.id)
  const user   = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw NotFound('user.not_found', 'USER_NOT_FOUND')

  const rows = await prisma.userRole.findMany({
    where:   { userId },
    include: { role: true },
    orderBy: { role: { isSystem: 'desc' } },
  })

  res.json({
    roles: rows.map(r => ({
      id:          r.role.id.toString(),
      key:         r.role.key,
      name:        r.role.name,
      description: r.role.description,
      isSystem:    r.role.isSystem,
    })),
  })
}

const setSchema = z.object({
  roleIds: z.array(z.string().regex(/^\d+$/)).max(20),
})

export async function setUserRoles(req: Request, res: Response) {
  const userId = parseId(req.params.id)
  const body   = setSchema.parse(req.body)
  const roleIds = body.roleIds.map(s => BigInt(s))

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
  if (!user) throw NotFound('user.not_found', 'USER_NOT_FOUND')

  if (roleIds.length > 0) {
    const found = await prisma.appRole.findMany({
      where:  { id: { in: roleIds } },
      select: { id: true },
    })
    if (found.length !== roleIds.length) {
      throw BadRequest('role.invalid_ids', 'INVALID_ROLE_IDS')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } })
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map(rid => ({ userId, roleId: rid })),
      })
    }
  })

  invalidatePermissionCache(userId)

  logAuditAsync({
    action: 'admin.user.set_roles', entityType: 'user', entityId: userId,
    actorId: BigInt(req.user!.sub), actorRole: req.user!.role,
    diff: { email: user.email, roleCount: roleIds.length }, ipAddress: clientIp(req),
  })

  res.json({ ok: true, roleCount: roleIds.length })
}

function parseId(raw: string): bigint {
  try { return BigInt(raw) } catch { throw BadRequest('validation.invalid_id', 'INVALID_ID') }
}
