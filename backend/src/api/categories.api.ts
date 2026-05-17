import type { Request, Response } from 'express'
import { prisma } from '@/lib/prisma'

export async function list(_req: Request, res: Response) {
  const items = await prisma.category.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
  })
  res.json({ items })
}
