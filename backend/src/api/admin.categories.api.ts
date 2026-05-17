import type { Request, Response } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, Conflict, NotFound } from '@/lib/errors'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

// =====================================================================
// Schemas
// =====================================================================

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const createSchema = z.object({
  slug:          z.string().trim().regex(slugRegex, 'validation.slug_format').min(2).max(100),
  nameVi:        z.string().trim().min(2).max(150),
  nameEn:        z.string().trim().max(150).nullable().optional(),
  descriptionVi: z.string().trim().max(2000).nullable().optional(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  imageUrl:      z.string().trim().max(500).url().nullable().optional(),
  displayOrder:  z.number().int().min(0).default(0),
  isActive:      z.boolean().default(true),
})

const updateSchema = createSchema.partial()

const reorderSchema = z.object({
  displayOrder: z.number().int().min(0),
})

// =====================================================================
// Helpers
// =====================================================================

function shape(c: {
  id: bigint; slug: string; nameVi: string; nameEn: string | null
  descriptionVi: string | null; descriptionEn: string | null; imageUrl: string | null
  displayOrder: number; isActive: boolean; createdAt: Date; updatedAt: Date
}, dishCount?: number) {
  return {
    id:            c.id.toString(),
    slug:          c.slug,
    nameVi:        c.nameVi,
    nameEn:        c.nameEn,
    descriptionVi: c.descriptionVi,
    descriptionEn: c.descriptionEn,
    imageUrl:      c.imageUrl,
    displayOrder:  c.displayOrder,
    isActive:      c.isActive,
    createdAt:     c.createdAt.toISOString(),
    updatedAt:     c.updatedAt.toISOString(),
    dishCount:     dishCount ?? 0,
  }
}

// =====================================================================
// GET /api/admin/categories
// =====================================================================

const listQuerySchema = z.object({
  q:               z.string().trim().min(1).max(100).optional(),
  includeInactive: z.coerce.boolean().default(true),
})

export async function list(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query)

  const where: Prisma.CategoryWhereInput = {
    ...(q.includeInactive ? {} : { isActive: true }),
    ...(q.q ? {
      OR: [
        { slug:   { contains: q.q } },
        { nameVi: { contains: q.q } },
        { nameEn: { contains: q.q } },
      ],
    } : {}),
  }

  const cats = await prisma.category.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { dishes: true } } },
  })

  res.json({
    categories: cats.map(c => shape(c, c._count.dishes)),
  })
}

// =====================================================================
// POST /api/admin/categories
// =====================================================================

export async function create(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const body = createSchema.parse(req.body)

  const existing = await prisma.category.findUnique({ where: { slug: body.slug } })
  if (existing) throw Conflict('category.slug_taken', 'SLUG_TAKEN')

  const created = await prisma.category.create({
    data: {
      slug:          body.slug,
      nameVi:        body.nameVi,
      nameEn:        body.nameEn ?? null,
      descriptionVi: body.descriptionVi ?? null,
      descriptionEn: body.descriptionEn ?? null,
      imageUrl:      body.imageUrl      ?? null,
      displayOrder:  body.displayOrder,
      isActive:      body.isActive,
    },
  })

  logAuditAsync({
    action: 'admin.category.created', entityType: 'category', entityId: created.id,
    actorId, actorRole: req.user!.role, diff: body, ipAddress: clientIp(req),
  })

  res.status(201).json({ category: shape(created, 0) })
}

// =====================================================================
// PATCH /api/admin/categories/:id
// =====================================================================

export async function update(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = updateSchema.parse(req.body)

  const target = await prisma.category.findUnique({ where: { id } })
  if (!target) throw NotFound('category.not_found')

  // Slug đổi → check unique
  if (body.slug && body.slug !== target.slug) {
    const dup = await prisma.category.findUnique({ where: { slug: body.slug } })
    if (dup) throw Conflict('category.slug_taken', 'SLUG_TAKEN')
  }

  const data: Prisma.CategoryUpdateInput = {}
  if (body.slug          !== undefined) data.slug          = body.slug
  if (body.nameVi        !== undefined) data.nameVi        = body.nameVi
  if (body.nameEn        !== undefined) data.nameEn        = body.nameEn
  if (body.descriptionVi !== undefined) data.descriptionVi = body.descriptionVi
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn
  if (body.imageUrl      !== undefined) data.imageUrl      = body.imageUrl
  if (body.displayOrder  !== undefined) data.displayOrder  = body.displayOrder
  if (body.isActive      !== undefined) data.isActive      = body.isActive

  const updated = await prisma.category.update({
    where: { id }, data,
    include: { _count: { select: { dishes: true } } },
  })

  logAuditAsync({
    action: 'admin.category.updated', entityType: 'category', entityId: id,
    actorId, actorRole: req.user!.role, diff: data as Record<string, unknown>, ipAddress: clientIp(req),
  })

  res.json({ category: shape(updated, updated._count.dishes) })
}

// =====================================================================
// DELETE /api/admin/categories/:id — chặn nếu còn dishes
// =====================================================================

export async function remove(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { dishes: true } } },
  })
  if (!target) throw NotFound('category.not_found')

  if (target._count.dishes > 0) {
    throw BadRequest('category.has_dishes', 'CATEGORY_HAS_DISHES', { count: target._count.dishes })
  }

  await prisma.category.delete({ where: { id } })

  logAuditAsync({
    action: 'admin.category.deleted', entityType: 'category', entityId: id,
    actorId, actorRole: req.user!.role, diff: { slug: target.slug }, ipAddress: clientIp(req),
  })

  res.json({ ok: true })
}

// =====================================================================
// POST /api/admin/categories/:id/reorder — đổi display_order
// =====================================================================

export async function reorder(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = reorderSchema.parse(req.body)

  const target = await prisma.category.findUnique({ where: { id } })
  if (!target) throw NotFound('category.not_found')

  const updated = await prisma.category.update({
    where: { id }, data: { displayOrder: body.displayOrder },
    include: { _count: { select: { dishes: true } } },
  })

  logAuditAsync({
    action: 'admin.category.reordered', entityType: 'category', entityId: id,
    actorId, actorRole: req.user!.role,
    diff: { from: target.displayOrder, to: body.displayOrder },
    ipAddress: clientIp(req),
  })

  res.json({ category: shape(updated, updated._count.dishes) })
}
