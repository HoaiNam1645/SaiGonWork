import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFound } from '@/lib/errors'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

// =====================================================================
// Schemas
// =====================================================================

const optionCreateSchema = z.object({
  nameVi:       z.string().trim().min(1).max(100),
  nameEn:       z.string().trim().max(100).nullable().optional(),
  type:         z.enum(['single', 'multi']).default('single'),
  isRequired:   z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
})

const optionUpdateSchema = optionCreateSchema.partial()

const valueCreateSchema = z.object({
  labelVi:      z.string().trim().min(1).max(100),
  labelEn:      z.string().trim().max(100).nullable().optional(),
  priceDelta:   z.number().default(0),
  displayOrder: z.number().int().min(0).default(0),
  isActive:     z.boolean().default(true),
})

const valueUpdateSchema = valueCreateSchema.partial()

// =====================================================================
// Helpers
// =====================================================================

function shapeOption(o: {
  id: bigint; dishId: bigint; nameVi: string; nameEn: string | null
  type: string; isRequired: boolean; displayOrder: number
  values?: Array<{
    id: bigint; dishOptionId: bigint; labelVi: string; labelEn: string | null
    priceDelta: Prisma.Decimal; displayOrder: number; isActive: boolean
  }>
}) {
  return {
    id:           o.id.toString(),
    dishId:       o.dishId.toString(),
    nameVi:       o.nameVi,
    nameEn:       o.nameEn,
    type:         o.type,
    isRequired:   o.isRequired,
    displayOrder: o.displayOrder,
    values:       o.values?.map(v => ({
      id:           v.id.toString(),
      dishOptionId: v.dishOptionId.toString(),
      labelVi:      v.labelVi,
      labelEn:      v.labelEn,
      priceDelta:   Number(v.priceDelta),
      displayOrder: v.displayOrder,
      isActive:     v.isActive,
    })) ?? [],
  }
}

// =====================================================================
// GET /api/admin/dishes/:dishId/options — list options + values cho 1 dish
// =====================================================================

export async function listForDish(req: Request, res: Response) {
  const dishId = BigInt(req.params.dishId)
  const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { id: true, slug: true, nameVi: true } })
  if (!dish) throw NotFound('dish.not_found')

  const options = await prisma.dishOption.findMany({
    where:   { dishId },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    include: {
      values: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
    },
  })
  res.json({
    dish:    { id: dish.id.toString(), slug: dish.slug, nameVi: dish.nameVi },
    options: options.map(shapeOption),
  })
}

// =====================================================================
// POST /api/admin/dishes/:dishId/options — tạo option mới cho dish
// =====================================================================

export async function createOption(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const dishId  = BigInt(req.params.dishId)
  const body    = optionCreateSchema.parse(req.body)

  const dish = await prisma.dish.findUnique({ where: { id: dishId }, select: { id: true } })
  if (!dish) throw NotFound('dish.not_found')

  const created = await prisma.dishOption.create({
    data: {
      dishId,
      nameVi:       body.nameVi,
      nameEn:       body.nameEn ?? null,
      type:         body.type,
      isRequired:   body.isRequired,
      displayOrder: body.displayOrder,
    },
    include: { values: true },
  })

  logAuditAsync({
    action: 'admin.option.created', entityType: 'dish_option', entityId: created.id,
    actorId, actorRole: req.user!.role, diff: { dishId: dishId.toString(), nameVi: body.nameVi },
    ipAddress: clientIp(req),
  })

  res.status(201).json({ option: shapeOption(created) })
}

// =====================================================================
// PATCH /api/admin/options/:id — update option
// =====================================================================

export async function updateOption(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = optionUpdateSchema.parse(req.body)

  const target = await prisma.dishOption.findUnique({ where: { id } })
  if (!target) throw NotFound('option.not_found')

  const data: Prisma.DishOptionUpdateInput = {}
  if (body.nameVi       !== undefined) data.nameVi       = body.nameVi
  if (body.nameEn       !== undefined) data.nameEn       = body.nameEn
  if (body.type         !== undefined) data.type         = body.type
  if (body.isRequired   !== undefined) data.isRequired   = body.isRequired
  if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder

  const updated = await prisma.dishOption.update({
    where: { id }, data,
    include: { values: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] } },
  })

  logAuditAsync({
    action: 'admin.option.updated', entityType: 'dish_option', entityId: id,
    actorId, actorRole: req.user!.role, diff: body as Record<string, unknown>, ipAddress: clientIp(req),
  })

  res.json({ option: shapeOption(updated) })
}

// =====================================================================
// DELETE /api/admin/options/:id — cascade values (FK CASCADE từ schema)
// =====================================================================

export async function deleteOption(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.dishOption.findUnique({ where: { id } })
  if (!target) throw NotFound('option.not_found')

  await prisma.dishOption.delete({ where: { id } })

  logAuditAsync({
    action: 'admin.option.deleted', entityType: 'dish_option', entityId: id,
    actorId, actorRole: req.user!.role, diff: { nameVi: target.nameVi }, ipAddress: clientIp(req),
  })

  res.json({ ok: true })
}

// =====================================================================
// POST /api/admin/options/:optionId/values — tạo value mới
// =====================================================================

export async function createValue(req: Request, res: Response) {
  const actorId  = BigInt(req.user!.sub)
  const optionId = BigInt(req.params.optionId)
  const body     = valueCreateSchema.parse(req.body)

  const opt = await prisma.dishOption.findUnique({ where: { id: optionId } })
  if (!opt) throw NotFound('option.not_found')

  const created = await prisma.dishOptionValue.create({
    data: {
      dishOptionId: optionId,
      labelVi:      body.labelVi,
      labelEn:      body.labelEn ?? null,
      priceDelta:   new Prisma.Decimal(body.priceDelta),
      displayOrder: body.displayOrder,
      isActive:     body.isActive,
    },
  })

  logAuditAsync({
    action: 'admin.option_value.created', entityType: 'dish_option_value', entityId: created.id,
    actorId, actorRole: req.user!.role, diff: { optionId: optionId.toString(), labelVi: body.labelVi },
    ipAddress: clientIp(req),
  })

  res.status(201).json({
    value: {
      id:           created.id.toString(),
      dishOptionId: created.dishOptionId.toString(),
      labelVi:      created.labelVi,
      labelEn:      created.labelEn,
      priceDelta:   Number(created.priceDelta),
      displayOrder: created.displayOrder,
      isActive:     created.isActive,
    },
  })
}

// =====================================================================
// PATCH /api/admin/values/:id — update value
// =====================================================================

export async function updateValue(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = valueUpdateSchema.parse(req.body)

  const target = await prisma.dishOptionValue.findUnique({ where: { id } })
  if (!target) throw NotFound('value.not_found')

  const data: Prisma.DishOptionValueUpdateInput = {}
  if (body.labelVi      !== undefined) data.labelVi      = body.labelVi
  if (body.labelEn      !== undefined) data.labelEn      = body.labelEn
  if (body.priceDelta   !== undefined) data.priceDelta   = new Prisma.Decimal(body.priceDelta)
  if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder
  if (body.isActive     !== undefined) data.isActive     = body.isActive

  const updated = await prisma.dishOptionValue.update({ where: { id }, data })

  logAuditAsync({
    action: 'admin.option_value.updated', entityType: 'dish_option_value', entityId: id,
    actorId, actorRole: req.user!.role, diff: body as Record<string, unknown>, ipAddress: clientIp(req),
  })

  res.json({
    value: {
      id:           updated.id.toString(),
      dishOptionId: updated.dishOptionId.toString(),
      labelVi:      updated.labelVi,
      labelEn:      updated.labelEn,
      priceDelta:   Number(updated.priceDelta),
      displayOrder: updated.displayOrder,
      isActive:     updated.isActive,
    },
  })
}

// =====================================================================
// DELETE /api/admin/values/:id
// =====================================================================

export async function deleteValue(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.dishOptionValue.findUnique({ where: { id } })
  if (!target) throw NotFound('value.not_found')

  await prisma.dishOptionValue.delete({ where: { id } })

  logAuditAsync({
    action: 'admin.option_value.deleted', entityType: 'dish_option_value', entityId: id,
    actorId, actorRole: req.user!.role, diff: { labelVi: target.labelVi }, ipAddress: clientIp(req),
  })

  res.json({ ok: true })
}
