import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BadRequest, NotFound, Forbidden } from '@/lib/errors'
import { invalidatePermissionCache } from '@/middleware/permission'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

interface RoleRow {
  id:          bigint
  key:         string
  name:        string
  description: string | null
  isSystem:    boolean
  createdAt:   Date
  updatedAt:   Date
  _count?:     { users: number; permissions: number }
}

function shape(r: RoleRow) {
  return {
    id:           r.id.toString(),
    key:          r.key,
    name:         r.name,
    description:  r.description,
    isSystem:     r.isSystem,
    userCount:    r._count?.users       ?? 0,
    permissionCount: r._count?.permissions ?? 0,
    createdAt:    r.createdAt,
    updatedAt:    r.updatedAt,
  }
}

// =====================================================================
// GET /api/admin/roles
// Mặc định ẩn 'customer' role — auto-assigned khi register, không phải role
// để admin quản. Pass ?includeCustomer=true để xem tất cả (debug).
// =====================================================================
export async function list(req: Request, res: Response) {
  const includeCustomer = req.query.includeCustomer === 'true'
  const rows = await prisma.appRole.findMany({
    where: includeCustomer ? {} : { key: { not: 'customer' } },
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    include: { _count: { select: { users: true, permissions: true } } },
  })
  res.json({ roles: rows.map(shape) })
}

// =====================================================================
// GET /api/admin/roles/:id — detail + permission ids
// =====================================================================
export async function getOne(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const role = await prisma.appRole.findUnique({
    where:   { id },
    include: {
      _count: { select: { users: true, permissions: true } },
      permissions: { select: { permissionId: true } },
    },
  })
  if (!role) throw NotFound('role.not_found', 'ROLE_NOT_FOUND')

  res.json({
    role: {
      ...shape(role),
      permissionIds: role.permissions.map(rp => rp.permissionId.toString()),
    },
  })
}

// =====================================================================
// POST /api/admin/roles — tạo custom role mới
// =====================================================================
const createSchema = z.object({
  key:         z.string().trim().min(2).max(50).regex(/^[a-z][a-z0-9_-]*$/i, 'role.key_invalid'),
  name:        z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).nullable().optional(),
})

export async function create(req: Request, res: Response) {
  const body = createSchema.parse(req.body)
  const keyLower = body.key.toLowerCase()

  const dup = await prisma.appRole.findUnique({ where: { key: keyLower } })
  if (dup) throw BadRequest('role.key_taken', 'ROLE_KEY_TAKEN')

  const created = await prisma.appRole.create({
    data: {
      key:         keyLower,
      name:        body.name,
      description: body.description ?? null,
      isSystem:    false,
    },
  })

  logAuditAsync({
    action: 'admin.role.create', entityType: 'role', entityId: created.id,
    actorId: BigInt(req.user!.sub), actorRole: req.user!.role,
    diff: { key: created.key, name: created.name }, ipAddress: clientIp(req),
  })

  res.status(201).json({ role: shape(created) })
}

// =====================================================================
// PATCH /api/admin/roles/:id — sửa name/description (KHÔNG đổi key, không đổi isSystem)
// =====================================================================
const updateSchema = z.object({
  name:        z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(255).nullable().optional(),
}).refine(d => d.name !== undefined || d.description !== undefined, {
  message: 'validation.required',
})

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const body = updateSchema.parse(req.body)

  const existing = await prisma.appRole.findUnique({ where: { id } })
  if (!existing) throw NotFound('role.not_found', 'ROLE_NOT_FOUND')

  const updated = await prisma.appRole.update({
    where: { id },
    data: {
      ...(body.name        !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description ?? null } : {}),
    },
  })

  logAuditAsync({
    action: 'admin.role.update', entityType: 'role', entityId: id,
    actorId: BigInt(req.user!.sub), actorRole: req.user!.role,
    diff: { key: existing.key, fields: Object.keys(body) }, ipAddress: clientIp(req),
  })

  res.json({ role: shape(updated) })
}

// =====================================================================
// PUT /api/admin/roles/:id/permissions — replace toàn bộ permissions
// =====================================================================
const setPermsSchema = z.object({
  permissionIds: z.array(z.string().regex(/^\d+$/)).max(500),
})

export async function setPermissions(req: Request, res: Response) {
  const id   = parseId(req.params.id)
  const body = setPermsSchema.parse(req.body)
  const permIds = body.permissionIds.map(s => BigInt(s))

  const role = await prisma.appRole.findUnique({ where: { id } })
  if (!role) throw NotFound('role.not_found', 'ROLE_NOT_FOUND')

  // Validate tất cả permission ids tồn tại (và không deprecated)
  if (permIds.length > 0) {
    const found = await prisma.permission.findMany({
      where:  { id: { in: permIds }, isDeprecated: false },
      select: { id: true },
    })
    if (found.length !== permIds.length) {
      throw BadRequest('role.invalid_permission_ids', 'INVALID_PERMISSION_IDS')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } })
    if (permIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permIds.map(pid => ({ roleId: id, permissionId: pid })),
      })
    }
  })

  // Invalidate permission cache cho tất cả users có role này
  const userRows = await prisma.userRole.findMany({
    where:  { roleId: id },
    select: { userId: true },
  })
  for (const u of userRows) invalidatePermissionCache(u.userId)

  logAuditAsync({
    action: 'admin.role.set_permissions', entityType: 'role', entityId: id,
    actorId: BigInt(req.user!.sub), actorRole: req.user!.role,
    diff: { key: role.key, count: permIds.length }, ipAddress: clientIp(req),
  })

  res.json({ ok: true, permissionCount: permIds.length })
}

// =====================================================================
// DELETE /api/admin/roles/:id — chỉ custom role (không phải system)
// =====================================================================
export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const role = await prisma.appRole.findUnique({
    where:   { id },
    include: { _count: { select: { users: true } } },
  })
  if (!role) throw NotFound('role.not_found', 'ROLE_NOT_FOUND')
  if (role.isSystem) throw Forbidden('role.system_immutable', 'ROLE_SYSTEM_IMMUTABLE')

  if (role._count.users > 0) {
    throw BadRequest('role.has_users', 'ROLE_HAS_USERS', { count: role._count.users })
  }

  await prisma.appRole.delete({ where: { id } })

  logAuditAsync({
    action: 'admin.role.delete', entityType: 'role', entityId: id,
    actorId: BigInt(req.user!.sub), actorRole: req.user!.role,
    diff: { key: role.key }, ipAddress: clientIp(req),
  })

  res.json({ ok: true })
}

function parseId(raw: string): bigint {
  try { return BigInt(raw) } catch { throw BadRequest('validation.invalid_id', 'INVALID_ID') }
}
