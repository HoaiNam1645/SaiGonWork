import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BadRequest, Forbidden, NotFound } from '@/lib/errors'

export const MAX_ADDRESSES_PER_USER = 3

// =====================================================================
// Schemas
// =====================================================================

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })

const baseAddress = z.object({
  recipient:  z.string().trim().min(2, { message: 'validation.required' }).max(100),
  phone:      phoneSchema,
  line:       z.string().trim().min(5, { message: 'validation.address_line_short' }).max(255),
  ward:       z.string().max(100).optional().nullable(),
  district:   z.string().max(100).optional().nullable(),
  city:       z.string().trim().min(1).max(100),
  country:    z.string().length(2).default('DE'),
  postalCode: z.string().max(20).optional().nullable(),
  lat:        z.number().min(-90).max(90).optional().nullable(),
  lng:        z.number().min(-180).max(180).optional().nullable(),
  note:       z.string().max(255).optional().nullable(),
  isDefault:  z.boolean().optional().default(false),
})

const createSchema = baseAddress

const updateSchema = baseAddress.partial()

// =====================================================================
// Helpers
// =====================================================================

function shape(a: {
  id: bigint
  recipient: string
  phone: string
  line: string
  ward: string | null
  district: string | null
  city: string
  country: string
  postalCode: string | null
  lat: { toString(): string } | null
  lng: { toString(): string } | null
  note: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id:         a.id.toString(),
    recipient:  a.recipient,
    phone:      a.phone,
    line:       a.line,
    ward:       a.ward,
    district:   a.district,
    city:       a.city,
    country:    a.country,
    postalCode: a.postalCode,
    lat:        a.lat != null ? Number(a.lat) : null,
    lng:        a.lng != null ? Number(a.lng) : null,
    note:       a.note,
    isDefault:  a.isDefault,
    createdAt:  a.createdAt,
    updatedAt:  a.updatedAt,
  }
}

// =====================================================================
// Handlers
// =====================================================================

export async function list(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const addresses = await prisma.address.findMany({
    where:   { userId },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
  res.json({ addresses: addresses.map(shape) })
}

export async function create(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const body   = createSchema.parse(req.body)

  // Giới hạn tối đa 3 địa chỉ per user (theo spec FE)
  const existingCount = await prisma.address.count({ where: { userId } })
  if (existingCount >= MAX_ADDRESSES_PER_USER) {
    throw BadRequest('address.limit_reached', 'ADDRESS_LIMIT', { max: MAX_ADDRESSES_PER_USER })
  }
  // Nếu user chưa có address nào → row đầu tiên LUÔN là default (kể cả body.isDefault=false)
  const forceDefault  = existingCount === 0
  const wantDefault   = forceDefault || body.isDefault === true

  const created = await prisma.$transaction(async tx => {
    const a = await tx.address.create({
      data: {
        userId,
        recipient:  body.recipient,
        phone:      body.phone,
        line:       body.line,
        ward:       body.ward ?? null,
        district:   body.district ?? null,
        city:       body.city,
        country:    body.country,
        postalCode: body.postalCode ?? null,
        lat:        body.lat ?? null,
        lng:        body.lng ?? null,
        note:       body.note ?? null,
        isDefault:  wantDefault,
      },
    })
    if (wantDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: a.id } },
        data:  { isDefault: false },
      })
    }
    return a
  })
  res.status(201).json({ address: shape(created) })
}

export async function update(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const id     = BigInt(req.params.id)
  const body   = updateSchema.parse(req.body)

  const target = await prisma.address.findUnique({ where: { id } })
  if (!target)                 throw NotFound('address.not_found')
  if (target.userId !== userId) throw Forbidden('address.not_owner')

  const updated = await prisma.$transaction(async tx => {
    const a = await tx.address.update({
      where: { id },
      data: {
        ...(body.recipient  !== undefined ? { recipient:  body.recipient } : {}),
        ...(body.phone      !== undefined ? { phone:      body.phone     } : {}),
        ...(body.line       !== undefined ? { line:       body.line      } : {}),
        ...(body.ward       !== undefined ? { ward:       body.ward      } : {}),
        ...(body.district   !== undefined ? { district:   body.district  } : {}),
        ...(body.city       !== undefined ? { city:       body.city      } : {}),
        ...(body.country    !== undefined ? { country:    body.country   } : {}),
        ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
        ...(body.lat        !== undefined ? { lat:        body.lat       } : {}),
        ...(body.lng        !== undefined ? { lng:        body.lng       } : {}),
        ...(body.note       !== undefined ? { note:       body.note      } : {}),
        ...(body.isDefault  !== undefined ? { isDefault:  body.isDefault } : {}),
      },
    })
    if (body.isDefault === true) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: a.id } },
        data:  { isDefault: false },
      })
    }
    return a
  })
  res.json({ address: shape(updated) })
}

export async function remove(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const id     = BigInt(req.params.id)

  const target = await prisma.address.findUnique({ where: { id } })
  if (!target)                 throw NotFound('address.not_found')
  if (target.userId !== userId) throw Forbidden('address.not_owner')

  await prisma.$transaction(async tx => {
    await tx.address.delete({ where: { id } })
    if (target.isDefault) {
      // Promote địa chỉ mới nhất còn lại làm default
      const next = await tx.address.findFirst({
        where:   { userId },
        orderBy: { updatedAt: 'desc' },
      })
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }
  })
  res.json({ ok: true })
}

export async function setDefault(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const id     = BigInt(req.params.id)

  const target = await prisma.address.findUnique({ where: { id } })
  if (!target)                 throw NotFound('address.not_found')
  if (target.userId !== userId) throw Forbidden('address.not_owner')

  await prisma.$transaction(async tx => {
    await tx.address.updateMany({
      where: { userId, isDefault: true },
      data:  { isDefault: false },
    })
    await tx.address.update({ where: { id }, data: { isDefault: true } })
  })
  res.json({ ok: true })
}

