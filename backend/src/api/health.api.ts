import type { Request, Response } from 'express'
import { prisma } from '@/lib/prisma'

export function status(_req: Request, res: Response) {
  res.json({ status: 'ok', uptime: process.uptime() })
}

export async function db(_req: Request, res: Response) {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok', db: 'connected' })
}
