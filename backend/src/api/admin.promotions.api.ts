import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, NotFound } from '@/lib/errors'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

const typeEnum = z.enum(['percent', 'fixed', 'free_ship'])

const baseSchema = z.object({
  code:         z.string().trim().min(2).max(50).transform(v => v.toUpperCase()),
  description:  z.string().trim().max(255).nullable().optional(),
  type:         typeEnum,
  value:        z.number().min(0).max(100000),
  minOrder:     z.number().min(0).default(0),
  maxDiscount:  z.number().min(0).nullable().optional(),
  startsAt:     z.string().datetime().nullable().optional(),
  endsAt:       z.string().datetime().nullable().optional(),
  usageLimit:   z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).nullable().optional(),
  isActive:     z.boolean().default(true),
})

const upsertSchema = baseSchema.refine(d => {
  if (d.type === 'percent') return d.value > 0 && d.value <= 100
  if (d.type === 'fixed')   return d.value > 0
  return true
}, { message: 'validation.value_invalid_for_type' })

const updateSchema = baseSchema.partial().refine(
  d => Object.keys(d).length > 0,
  { message: 'validation.required' },
)

interface PromotionRow {
  id:           bigint
  code:         string
  description:  string | null
  type:         string
  value:        Prisma.Decimal
  minOrder:     Prisma.Decimal
  maxDiscount:  Prisma.Decimal | null
  startsAt:     Date | null
  endsAt:       Date | null
  usageLimit:   number | null
  perUserLimit: number | null
  usedCount:    number
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

function shape(p: PromotionRow) {
  return {
    id:           p.id.toString(),
    code:         p.code,
    description:  p.description,
    type:         p.type,
    value:        Number(p.value),
    minOrder:     Number(p.minOrder),
    maxDiscount:  p.maxDiscount != null ? Number(p.maxDiscount) : null,
    startsAt:     p.startsAt,
    endsAt:       p.endsAt,
    usageLimit:   p.usageLimit,
    perUserLimit: p.perUserLimit,
    usedCount:    p.usedCount,
    isActive:     p.isActive,
    createdAt:    p.createdAt,
    updatedAt:    p.updatedAt,
  }
}

// =====================================================================
// GET /api/admin/promotions
// =====================================================================

const listQuery = z.object({
  q:      z.string().trim().min(1).max(100).optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  sort:   z.enum(['created_desc', 'created_asc', 'used_desc', 'code_asc']).default('created_desc'),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function list(req: Request, res: Response) {
  const q = listQuery.parse(req.query)

  const where: Prisma.PromotionWhereInput = {
    ...(q.status === 'active'   ? { isActive: true  } : {}),
    ...(q.status === 'inactive' ? { isActive: false } : {}),
    ...(q.q ? {
      OR: [
        { code:        { contains: q.q } },
        { description: { contains: q.q } },
      ],
    } : {}),
  }

  const orderBy: Prisma.PromotionOrderByWithRelationInput =
    q.sort === 'created_asc' ? { createdAt: 'asc'  } :
    q.sort === 'used_desc'   ? { usedCount: 'desc' } :
    q.sort === 'code_asc'    ? { code:      'asc'  } :
                               { createdAt: 'desc' }

  const [rows, total] = await Promise.all([
    prisma.promotion.findMany({ where, orderBy, take: q.limit, skip: q.offset }),
    prisma.promotion.count({ where }),
  ])

  res.json({
    promotions: rows.map(shape),
    total,
    limit:  q.limit,
    offset: q.offset,
  })
}

// =====================================================================
// GET /api/admin/promotions/:id — include vài đơn đã áp gần đây
// =====================================================================

export async function getOne(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const p  = await prisma.promotion.findUnique({ where: { id } })
  if (!p) throw NotFound('promo.not_found', 'PROMO_NOT_FOUND')

  const recentOrders = await prisma.order.findMany({
    where:   { promotionId: id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  {
      id: true, code: true, total: true, currency: true, status: true,
      createdAt: true, contactName: true, contactEmail: true,
    },
  })

  res.json({
    promotion: shape(p),
    recentOrders: recentOrders.map(o => ({
      id:           o.id.toString(),
      code:         o.code,
      total:        Number(o.total),
      currency:     o.currency,
      status:       o.status,
      createdAt:    o.createdAt,
      contactName:  o.contactName,
      contactEmail: o.contactEmail,
    })),
  })
}

// =====================================================================
// POST /api/admin/promotions
// =====================================================================

export async function create(req: Request, res: Response) {
  const body = upsertSchema.parse(req.body)

  if (body.startsAt && body.endsAt && new Date(body.startsAt) > new Date(body.endsAt)) {
    throw BadRequest('validation.dates_invalid', 'DATES_INVALID')
  }

  const dup = await prisma.promotion.findUnique({ where: { code: body.code } })
  if (dup) throw BadRequest('promo.code_taken', 'PROMO_CODE_TAKEN')

  const created = await prisma.promotion.create({
    data: {
      code:         body.code,
      description:  body.description ?? null,
      type:         body.type,
      value:        new Prisma.Decimal(body.value),
      minOrder:     new Prisma.Decimal(body.minOrder),
      maxDiscount:  body.maxDiscount != null ? new Prisma.Decimal(body.maxDiscount) : null,
      startsAt:     body.startsAt ? new Date(body.startsAt) : null,
      endsAt:       body.endsAt   ? new Date(body.endsAt)   : null,
      usageLimit:   body.usageLimit   ?? null,
      perUserLimit: body.perUserLimit ?? null,
      isActive:     body.isActive,
    },
  })

  logAuditAsync({
    action:     'admin.promotion.create',
    entityType: 'promotion',
    entityId:   created.id,
    actorId:    BigInt(req.user!.sub),
    actorRole:  req.user!.role,
    diff:       { code: created.code, type: created.type, value: Number(created.value) },
    ipAddress:  clientIp(req),
  })

  res.status(201).json({ promotion: shape(created) })
}

// =====================================================================
// PATCH /api/admin/promotions/:id
// =====================================================================

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const body = updateSchema.parse(req.body)

  const existing = await prisma.promotion.findUnique({ where: { id } })
  if (!existing) throw NotFound('promo.not_found', 'PROMO_NOT_FOUND')

  // Nếu đổi code, check trùng
  if (body.code && body.code !== existing.code) {
    const dup = await prisma.promotion.findUnique({ where: { code: body.code } })
    if (dup) throw BadRequest('promo.code_taken', 'PROMO_CODE_TAKEN')
  }

  const startsAt = body.startsAt !== undefined
    ? (body.startsAt ? new Date(body.startsAt) : null)
    : existing.startsAt
  const endsAt = body.endsAt !== undefined
    ? (body.endsAt ? new Date(body.endsAt) : null)
    : existing.endsAt
  if (startsAt && endsAt && startsAt > endsAt) {
    throw BadRequest('validation.dates_invalid', 'DATES_INVALID')
  }

  const data: Prisma.PromotionUpdateInput = {}
  if (body.code         !== undefined) data.code         = body.code
  if (body.description  !== undefined) data.description  = body.description ?? null
  if (body.type         !== undefined) data.type         = body.type
  if (body.value        !== undefined) data.value        = new Prisma.Decimal(body.value)
  if (body.minOrder     !== undefined) data.minOrder     = new Prisma.Decimal(body.minOrder)
  if (body.maxDiscount  !== undefined) data.maxDiscount  = body.maxDiscount != null ? new Prisma.Decimal(body.maxDiscount) : null
  if (body.startsAt     !== undefined) data.startsAt     = startsAt
  if (body.endsAt       !== undefined) data.endsAt       = endsAt
  if (body.usageLimit   !== undefined) data.usageLimit   = body.usageLimit   ?? null
  if (body.perUserLimit !== undefined) data.perUserLimit = body.perUserLimit ?? null
  if (body.isActive     !== undefined) data.isActive     = body.isActive

  const updated = await prisma.promotion.update({ where: { id }, data })

  logAuditAsync({
    action:     'admin.promotion.update',
    entityType: 'promotion',
    entityId:   id,
    actorId:    BigInt(req.user!.sub),
    actorRole:  req.user!.role,
    diff:       { code: updated.code, fields: Object.keys(body) },
    ipAddress:  clientIp(req),
  })

  res.json({ promotion: shape(updated) })
}

// =====================================================================
// POST /api/admin/promotions/:id/toggle
// =====================================================================

export async function toggle(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const existing = await prisma.promotion.findUnique({ where: { id } })
  if (!existing) throw NotFound('promo.not_found', 'PROMO_NOT_FOUND')

  const updated = await prisma.promotion.update({
    where: { id },
    data:  { isActive: !existing.isActive },
  })

  logAuditAsync({
    action:     'admin.promotion.toggle',
    entityType: 'promotion',
    entityId:   id,
    actorId:    BigInt(req.user!.sub),
    actorRole:  req.user!.role,
    diff:       { code: updated.code, isActive: updated.isActive },
    ipAddress:  clientIp(req),
  })

  res.json({ promotion: shape(updated) })
}

// =====================================================================
// DELETE /api/admin/promotions/:id
// =====================================================================

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id)
  const existing = await prisma.promotion.findUnique({ where: { id } })
  if (!existing) throw NotFound('promo.not_found', 'PROMO_NOT_FOUND')

  // Nếu đã được dùng → không xóa, chỉ deactivate (để giữ ref từ order)
  if (existing.usedCount > 0) {
    throw BadRequest('promo.cannot_delete_used', 'PROMO_CANNOT_DELETE_USED')
  }

  await prisma.promotion.delete({ where: { id } })

  logAuditAsync({
    action:     'admin.promotion.delete',
    entityType: 'promotion',
    entityId:   id,
    actorId:    BigInt(req.user!.sub),
    actorRole:  req.user!.role,
    diff:       { code: existing.code },
    ipAddress:  clientIp(req),
  })

  res.json({ ok: true })
}

function parseId(raw: string): bigint {
  try { return BigInt(raw) } catch { throw BadRequest('validation.invalid_id', 'INVALID_ID') }
}
