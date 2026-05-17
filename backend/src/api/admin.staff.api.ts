import type { Request, Response } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, Conflict, Forbidden, NotFound } from '@/lib/errors'
import { generateTempPassword, hashPassword } from '@/lib/passwords'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

// =====================================================================
// Schemas
// =====================================================================

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })

const listQuerySchema = z.object({
  q:               z.string().trim().min(1).max(100).optional(),
  role:            z.enum(['staff', 'admin']).optional(),
  includeInactive: z.coerce.boolean().default(true),
  limit:           z.coerce.number().int().min(1).max(100).default(50),
  offset:          z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  email:    z.string().email({ message: 'validation.email_format' }).toLowerCase(),
  fullName: z.string().trim().min(2).max(100),
  phone:    phoneSchema.optional(),
  role:     z.enum(['staff', 'admin']).default('staff'),
})

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone:    z.union([phoneSchema, z.literal(''), z.null()]).optional(),
})

const changeRoleSchema = z.object({
  role: z.enum(['customer', 'staff', 'admin']),
})

// =====================================================================
// Helpers
// =====================================================================

const selectFields = {
  id:               true,
  email:            true,
  fullName:         true,
  phone:            true,
  role:             true,
  isActive:         true,
  emailVerifiedAt:  true,
  lastLoginAt:      true,
  createdAt:        true,
  updatedAt:        true,
} as const

type StaffRow = {
  id:              bigint
  email:           string
  fullName:        string
  phone:           string | null
  role:            string
  isActive:        boolean
  emailVerifiedAt: Date | null
  lastLoginAt:     Date | null
  createdAt:       Date
  updatedAt:       Date
}

function shape(u: StaffRow) {
  return {
    id:              u.id.toString(),
    email:           u.email,
    fullName:        u.fullName,
    phone:           u.phone,
    role:            u.role,
    isActive:        u.isActive,
    emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt:     u.lastLoginAt?.toISOString()     ?? null,
    createdAt:       u.createdAt.toISOString(),
    updatedAt:       u.updatedAt.toISOString(),
  }
}

/** Super admin = user role=admin có id thấp nhất. Chỉ super admin được change role. */
async function isSuperAdmin(userId: bigint): Promise<boolean> {
  const first = await prisma.user.findFirst({
    where:   { role: 'admin', isActive: true },
    orderBy: { id: 'asc' },
    select:  { id: true },
  })
  return !!first && first.id === userId
}

// =====================================================================
// GET /api/admin/staff
// =====================================================================

export async function list(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query)

  const where: Prisma.UserWhereInput = {
    role: q.role
      ? q.role
      : { in: ['staff', 'admin'] },
    ...(q.includeInactive ? {} : { isActive: true }),
    ...(q.q ? {
      OR: [
        { email:    { contains: q.q } },
        { fullName: { contains: q.q } },
        { phone:    { contains: q.q } },
      ],
    } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      take:    q.limit,
      skip:    q.offset,
      select:  selectFields,
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    staff: rows.map(shape),
    total,
    limit:  q.limit,
    offset: q.offset,
  })
}

// =====================================================================
// POST /api/admin/staff — tạo staff mới
// =====================================================================

export async function create(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const body = createSchema.parse(req.body)

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) throw Conflict('user.email_taken', 'EMAIL_TAKEN')

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const created = await prisma.user.create({
    data: {
      email:           body.email,
      fullName:        body.fullName,
      phone:           body.phone ?? null,
      role:            body.role,
      passwordHash,
      emailVerifiedAt: new Date(),  // admin-created → auto-verified
      isActive:        true,
    },
    select: selectFields,
  })

  logAuditAsync({
    action:     'admin.staff.created',
    entityType: 'user',
    entityId:   created.id,
    actorId,
    actorRole:  req.user!.role,
    diff:       { email: created.email, role: created.role },
    ipAddress:  clientIp(req),
  })

  // Trả về tempPassword 1 lần duy nhất để admin show cho staff đổi.
  // Email send là V2 (cần wire mailer + template "staff_created").
  res.status(201).json({
    staff:        shape(created),
    tempPassword,
  })
}

// =====================================================================
// PATCH /api/admin/staff/:id — update fullName/phone
// =====================================================================

export async function update(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = updateSchema.parse(req.body)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw NotFound('user.not_found')
  if (target.role === 'customer') {
    throw BadRequest('user.not_staff', 'NOT_STAFF')
  }

  const data: Prisma.UserUpdateInput = {}
  if (body.fullName !== undefined) data.fullName = body.fullName
  if (body.phone    !== undefined) data.phone    = body.phone === '' ? null : body.phone

  if (Object.keys(data).length === 0) {
    throw BadRequest('validation.required', 'NO_FIELDS')
  }

  const updated = await prisma.user.update({ where: { id }, data, select: selectFields })

  logAuditAsync({
    action:     'admin.staff.updated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    diff:       data,
    ipAddress:  clientIp(req),
  })

  res.json({ staff: shape(updated) })
}

// =====================================================================
// POST /api/admin/staff/:id/role — super admin only
// =====================================================================

export async function changeRole(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = changeRoleSchema.parse(req.body)

  if (id === actorId) {
    throw Forbidden('user.cannot_change_own_role', 'CANNOT_CHANGE_OWN_ROLE')
  }

  if (!(await isSuperAdmin(actorId))) {
    throw Forbidden('user.super_admin_required', 'SUPER_ADMIN_REQUIRED')
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw NotFound('user.not_found')
  if (target.role === body.role) {
    throw BadRequest('user.role_unchanged', 'ROLE_UNCHANGED')
  }

  const updated = await prisma.user.update({
    where: { id },
    data:  { role: body.role },
    select: selectFields,
  })

  logAuditAsync({
    action:     'admin.staff.role_changed',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    diff:       { from: target.role, to: body.role },
    ipAddress:  clientIp(req),
  })

  res.json({ staff: shape(updated) })
}

// =====================================================================
// POST /api/admin/staff/:id/deactivate
// =====================================================================

export async function deactivate(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  if (id === actorId) {
    throw Forbidden('user.cannot_deactivate_self', 'CANNOT_DEACTIVATE_SELF')
  }

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw NotFound('user.not_found')

  // Không cho deactivate super admin (id thấp nhất role admin)
  if (target.role === 'admin' && await isSuperAdmin(target.id)) {
    throw Forbidden('user.cannot_deactivate_super_admin', 'CANNOT_DEACTIVATE_SUPER_ADMIN')
  }

  if (!target.isActive) {
    res.json({ staff: shape(target as StaffRow) })
    return
  }

  const updated = await prisma.user.update({
    where:  { id },
    data:   { isActive: false },
    select: selectFields,
  })

  logAuditAsync({
    action:     'admin.staff.deactivated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    ipAddress:  clientIp(req),
  })

  res.json({ staff: shape(updated) })
}

// =====================================================================
// POST /api/admin/staff/:id/activate
// =====================================================================

export async function activate(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw NotFound('user.not_found')

  if (target.isActive) {
    res.json({ staff: shape(target as StaffRow) })
    return
  }

  const updated = await prisma.user.update({
    where:  { id },
    data:   { isActive: true },
    select: selectFields,
  })

  logAuditAsync({
    action:     'admin.staff.activated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    ipAddress:  clientIp(req),
  })

  res.json({ staff: shape(updated) })
}

// =====================================================================
// POST /api/admin/staff/:id/reset-password
// =====================================================================

export async function resetPassword(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw NotFound('user.not_found')

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.user.update({
    where: { id },
    data:  { passwordHash },
  })

  logAuditAsync({
    action:     'admin.staff.password_reset',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    ipAddress:  clientIp(req),
  })

  res.json({ tempPassword })
}
