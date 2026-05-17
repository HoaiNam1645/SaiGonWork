import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { NotFound } from '@/lib/errors'

const listQuerySchema = z.object({
  category: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  q:        z.string().optional(),
})

export async function list(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query)

  const items = await prisma.dish.findMany({
    where: {
      isAvailable: true,
      ...(q.featured ? { isFeatured: true } : {}),
      ...(q.category ? { category: { slug: q.category } } : {}),
      ...(q.q
        ? {
            OR: [
              { nameVi: { contains: q.q } },
              { nameEn: { contains: q.q } },
            ],
          }
        : {}),
    },
    include: { category: { select: { slug: true, nameVi: true, nameEn: true } } },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  })
  res.json({ items })
}

export async function detail(req: Request, res: Response) {
  const dish = await prisma.dish.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      options: {
        orderBy: { displayOrder: 'asc' },
        include: {
          values: {
            where:   { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  })
  if (!dish) throw NotFound('common.not_found')
  res.json(dish)
}
