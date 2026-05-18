import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, Conflict, NotFound } from '@/lib/errors'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

// =====================================================================
// Schemas
// =====================================================================

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Số món featured tối đa hiển thị trên trang chủ "Our Specialties" (PopularDishes).
// Đồng bộ với .slice(0, N) trong FE PopularDishes.tsx.
const FEATURED_LIMIT = 6

const createSchema = z.object({
  categoryId:    z.union([z.string(), z.number()]).transform(v => BigInt(v as string)),
  slug:          z.string().trim().regex(slugRegex, 'validation.slug_format').min(2).max(150),
  nameVi:        z.string().trim().min(2).max(200),
  nameEn:        z.string().trim().max(200).nullable().optional(),
  descriptionVi: z.string().trim().max(2000).nullable().optional(),
  descriptionEn: z.string().trim().max(2000).nullable().optional(),
  price:         z.number().nonnegative(),
  currency:      z.string().length(3).default('EUR'),
  imageUrl:      z.string().trim().max(500).url().nullable().optional(),
  isAvailable:   z.boolean().default(true),
  isFeatured:    z.boolean().default(false),
  prepTimeMin:   z.number().int().min(0).nullable().optional(),
  calories:      z.number().int().min(0).nullable().optional(),
  spicyLevel:    z.number().int().min(0).max(3).default(0),
  displayOrder:  z.number().int().min(0).default(0),
})

const updateSchema = createSchema.partial()

// =====================================================================
// Helpers
// =====================================================================

type DishWithCategory = {
  id:            bigint
  categoryId:    bigint
  slug:          string
  nameVi:        string
  nameEn:        string | null
  descriptionVi: string | null
  descriptionEn: string | null
  price:         Prisma.Decimal
  currency:      string
  imageUrl:      string | null
  isAvailable:   boolean
  isFeatured:    boolean
  prepTimeMin:   number | null
  calories:      number | null
  spicyLevel:    number
  displayOrder:  number
  createdAt:     Date
  updatedAt:     Date
  category?:     { id: bigint; slug: string; nameVi: string } | null
  _count?:       { options: number; orderItems: number }
}

function shape(d: DishWithCategory) {
  return {
    id:            d.id.toString(),
    categoryId:    d.categoryId.toString(),
    slug:          d.slug,
    nameVi:        d.nameVi,
    nameEn:        d.nameEn,
    descriptionVi: d.descriptionVi,
    descriptionEn: d.descriptionEn,
    price:         Number(d.price),
    currency:      d.currency,
    imageUrl:      d.imageUrl,
    isAvailable:   d.isAvailable,
    isFeatured:    d.isFeatured,
    prepTimeMin:   d.prepTimeMin,
    calories:      d.calories,
    spicyLevel:    d.spicyLevel,
    displayOrder:  d.displayOrder,
    createdAt:     d.createdAt.toISOString(),
    updatedAt:     d.updatedAt.toISOString(),
    category:      d.category ? {
      id: d.category.id.toString(), slug: d.category.slug, nameVi: d.category.nameVi,
    } : null,
    optionCount:    d._count?.options    ?? 0,
    orderItemCount: d._count?.orderItems ?? 0,
  }
}

// =====================================================================
// GET /api/admin/dishes
// =====================================================================

const listQuerySchema = z.object({
  q:                z.string().trim().min(1).max(100).optional(),
  categoryId:       z.union([z.string(), z.number()]).transform(v => BigInt(v as string)).optional(),
  availability:     z.enum(['all', 'available', 'unavailable']).default('all'),
  featuredOnly:     z.coerce.boolean().default(false),
  sort:             z.enum([
    'display_asc','display_desc',
    'name_asc','name_desc',
    'price_asc','price_desc',
    'created_desc','created_asc',
  ]).default('display_asc'),
  limit:            z.coerce.number().int().min(1).max(100).default(50),
  offset:           z.coerce.number().int().min(0).default(0),
})

export async function list(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query)

  const where: Prisma.DishWhereInput = {
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.availability === 'available'   ? { isAvailable: true  } : {}),
    ...(q.availability === 'unavailable' ? { isAvailable: false } : {}),
    ...(q.featuredOnly ? { isFeatured: true } : {}),
    ...(q.q ? {
      OR: [
        { slug:   { contains: q.q } },
        { nameVi: { contains: q.q } },
        { nameEn: { contains: q.q } },
      ],
    } : {}),
  }

  const orderBy: Prisma.DishOrderByWithRelationInput =
    q.sort === 'display_desc' ? { displayOrder: 'desc' } :
    q.sort === 'name_asc'     ? { nameVi:       'asc'  } :
    q.sort === 'name_desc'    ? { nameVi:       'desc' } :
    q.sort === 'price_asc'    ? { price:        'asc'  } :
    q.sort === 'price_desc'   ? { price:        'desc' } :
    q.sort === 'created_desc' ? { createdAt:    'desc' } :
    q.sort === 'created_asc'  ? { createdAt:    'asc'  } :
                                { displayOrder: 'asc'  }

  const [rows, total] = await Promise.all([
    prisma.dish.findMany({
      where,
      orderBy: [orderBy, { id: 'asc' }],
      take:    q.limit,
      skip:    q.offset,
      include: {
        category: { select: { id: true, slug: true, nameVi: true } },
        _count:   { select: { options: true, orderItems: true } },
      },
    }),
    prisma.dish.count({ where }),
  ])

  res.json({
    dishes: rows.map(shape),
    total,
    limit:  q.limit,
    offset: q.offset,
    sort:   q.sort,
  })
}

// =====================================================================
// GET /api/admin/dishes/:id — detail
// =====================================================================

export async function getOne(req: Request, res: Response) {
  const id = BigInt(req.params.id)
  const d = await prisma.dish.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, nameVi: true } },
      _count:   { select: { options: true, orderItems: true } },
    },
  })
  if (!d) throw NotFound('dish.not_found')
  res.json({ dish: shape(d) })
}

// =====================================================================
// POST /api/admin/dishes
// =====================================================================

export async function create(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const body = createSchema.parse(req.body)

  // Slug unique
  const dup = await prisma.dish.findUnique({ where: { slug: body.slug } })
  if (dup) throw Conflict('dish.slug_taken', 'SLUG_TAKEN')

  // Category exists
  const cat = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!cat) throw BadRequest('category.not_found', 'CATEGORY_NOT_FOUND')

  const created = await prisma.dish.create({
    data: {
      categoryId:    body.categoryId,
      slug:          body.slug,
      nameVi:        body.nameVi,
      nameEn:        body.nameEn ?? null,
      descriptionVi: body.descriptionVi ?? null,
      descriptionEn: body.descriptionEn ?? null,
      price:         new Prisma.Decimal(body.price),
      currency:      body.currency,
      imageUrl:      body.imageUrl ?? null,
      isAvailable:   body.isAvailable,
      isFeatured:    body.isFeatured,
      prepTimeMin:   body.prepTimeMin ?? null,
      calories:      body.calories    ?? null,
      spicyLevel:    body.spicyLevel,
      displayOrder:  body.displayOrder,
    },
    include: {
      category: { select: { id: true, slug: true, nameVi: true } },
      _count:   { select: { options: true, orderItems: true } },
    },
  })

  logAuditAsync({
    action: 'admin.dish.created', entityType: 'dish', entityId: created.id,
    actorId, actorRole: req.user!.role, diff: { slug: body.slug, nameVi: body.nameVi },
    ipAddress: clientIp(req),
  })

  res.status(201).json({ dish: shape(created) })
}

// =====================================================================
// PATCH /api/admin/dishes/:id
// =====================================================================

export async function update(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = updateSchema.parse(req.body)

  const target = await prisma.dish.findUnique({ where: { id } })
  if (!target) throw NotFound('dish.not_found')

  if (body.slug && body.slug !== target.slug) {
    const dup = await prisma.dish.findUnique({ where: { slug: body.slug } })
    if (dup) throw Conflict('dish.slug_taken', 'SLUG_TAKEN')
  }
  if (body.categoryId && body.categoryId !== target.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } })
    if (!cat) throw BadRequest('category.not_found', 'CATEGORY_NOT_FOUND')
  }

  const data: Prisma.DishUpdateInput = {}
  if (body.categoryId    !== undefined) data.category      = { connect: { id: body.categoryId } }
  if (body.slug          !== undefined) data.slug          = body.slug
  if (body.nameVi        !== undefined) data.nameVi        = body.nameVi
  if (body.nameEn        !== undefined) data.nameEn        = body.nameEn
  if (body.descriptionVi !== undefined) data.descriptionVi = body.descriptionVi
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn
  if (body.price         !== undefined) data.price         = new Prisma.Decimal(body.price)
  if (body.currency      !== undefined) data.currency      = body.currency
  if (body.imageUrl      !== undefined) data.imageUrl      = body.imageUrl
  if (body.isAvailable   !== undefined) data.isAvailable   = body.isAvailable
  if (body.isFeatured    !== undefined) data.isFeatured    = body.isFeatured
  if (body.prepTimeMin   !== undefined) data.prepTimeMin   = body.prepTimeMin
  if (body.calories      !== undefined) data.calories      = body.calories
  if (body.spicyLevel    !== undefined) data.spicyLevel    = body.spicyLevel
  if (body.displayOrder  !== undefined) data.displayOrder  = body.displayOrder

  const updated = await prisma.dish.update({
    where: { id }, data,
    include: {
      category: { select: { id: true, slug: true, nameVi: true } },
      _count:   { select: { options: true, orderItems: true } },
    },
  })

  logAuditAsync({
    action: 'admin.dish.updated', entityType: 'dish', entityId: id,
    actorId, actorRole: req.user!.role,
    diff: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as Record<string, unknown>,
    ipAddress: clientIp(req),
  })

  res.json({ dish: shape(updated) })
}

// =====================================================================
// DELETE /api/admin/dishes/:id — chặn nếu có order_items
// =====================================================================

export async function remove(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.dish.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  })
  if (!target) throw NotFound('dish.not_found')

  if (target._count.orderItems > 0) {
    throw BadRequest('dish.has_orders', 'DISH_HAS_ORDERS', { count: target._count.orderItems })
  }

  // CASCADE từ schema sẽ xóa dish_options + dish_option_values
  await prisma.dish.delete({ where: { id } })

  logAuditAsync({
    action: 'admin.dish.deleted', entityType: 'dish', entityId: id,
    actorId, actorRole: req.user!.role, diff: { slug: target.slug }, ipAddress: clientIp(req),
  })

  res.json({ ok: true })
}

// =====================================================================
// POST /api/admin/dishes/:id/toggle-availability + /toggle-featured
// =====================================================================

export async function toggleAvailability(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.dish.findUnique({ where: { id } })
  if (!target) throw NotFound('dish.not_found')

  const updated = await prisma.dish.update({
    where: { id }, data: { isAvailable: !target.isAvailable },
    include: {
      category: { select: { id: true, slug: true, nameVi: true } },
      _count:   { select: { options: true, orderItems: true } },
    },
  })

  logAuditAsync({
    action: 'admin.dish.availability_toggled', entityType: 'dish', entityId: id,
    actorId, actorRole: req.user!.role,
    diff: { from: target.isAvailable, to: !target.isAvailable }, ipAddress: clientIp(req),
  })

  res.json({ dish: shape(updated) })
}

export async function toggleFeatured(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.dish.findUnique({ where: { id } })
  if (!target) throw NotFound('dish.not_found')

  // Bật featured → check giới hạn 6 món (đồng bộ với FE PopularDishes.slice).
  if (!target.isFeatured) {
    const currentCount = await prisma.dish.count({ where: { isFeatured: true } })
    if (currentCount >= FEATURED_LIMIT) {
      throw BadRequest(
        'dish.featured_limit_reached',
        'FEATURED_LIMIT_REACHED',
        { limit: FEATURED_LIMIT },
      )
    }
  }

  const updated = await prisma.dish.update({
    where: { id }, data: { isFeatured: !target.isFeatured },
    include: {
      category: { select: { id: true, slug: true, nameVi: true } },
      _count:   { select: { options: true, orderItems: true } },
    },
  })

  logAuditAsync({
    action: 'admin.dish.featured_toggled', entityType: 'dish', entityId: id,
    actorId, actorRole: req.user!.role,
    diff: { from: target.isFeatured, to: !target.isFeatured }, ipAddress: clientIp(req),
  })

  res.json({ dish: shape(updated) })
}
