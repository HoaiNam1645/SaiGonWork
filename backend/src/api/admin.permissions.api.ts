import type { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { syncPermissionsFromRegistry } from '@/lib/permissionSync'

/**
 * GET /api/admin/permissions
 * Liệt kê permissions trong DB (đã sync từ code registry).
 * Group theo module ở FE để hiển thị checkbox tree.
 */
const listQuery = z.object({
  includeDeprecated: z.coerce.boolean().default(false),
  module:            z.string().trim().min(1).max(50).optional(),
})

export async function list(req: Request, res: Response) {
  const q = listQuery.parse(req.query)
  const rows = await prisma.permission.findMany({
    where: {
      ...(q.includeDeprecated ? {} : { isDeprecated: false }),
      ...(q.module            ? { module: q.module } : {}),
    },
    orderBy: [{ module: 'asc' }, { key: 'asc' }],
  })
  res.json({
    permissions: rows.map(p => ({
      id:           p.id.toString(),
      key:          p.key,
      method:       p.method,
      path:         p.path,
      module:       p.module,
      description:  p.description,
      isDeprecated: p.isDeprecated,
    })),
  })
}

/**
 * POST /api/admin/permissions/sync
 * Manual trigger sync registry → DB. Server tự sync lúc boot nên endpoint này
 * chỉ dùng khi muốn refresh ngay mà không restart (vd sau khi deploy code mới).
 */
export async function sync(_req: Request, res: Response) {
  const result = await syncPermissionsFromRegistry()
  res.json({ ok: true, ...result })
}
