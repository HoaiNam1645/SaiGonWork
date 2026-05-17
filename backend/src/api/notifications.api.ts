import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFound } from '@/lib/errors'

// =====================================================================
// Helpers
// =====================================================================

interface NotifWithReads {
  id:         bigint
  userId:     bigint | null
  type:       string
  metadata:   Prisma.JsonValue | null
  entityType: string | null
  entityId:   bigint | null
  actionUrl:  string | null
  createdAt:  Date
  reads:      Array<{ readAt: Date }>
}

function shape(n: NotifWithReads, userId: bigint) {
  const myRead = n.reads.find(() => true)   // include filter đã by userId
  return {
    id:         n.id.toString(),
    userId:     n.userId?.toString() ?? null,
    type:       n.type,
    metadata:   n.metadata,
    entityType: n.entityType,
    entityId:   n.entityId?.toString() ?? null,
    actionUrl:  n.actionUrl,
    createdAt:  n.createdAt.toISOString(),
    isRead:     !!myRead,
    readAt:     myRead?.readAt.toISOString() ?? null,
    // suppress unused
    _userId:    userId.toString(),
  }
}

// =====================================================================
// GET /api/notifications
// =====================================================================

const listQuerySchema = z.object({
  limit:      z.coerce.number().int().min(1).max(100).default(50),
  offset:     z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
})

export async function list(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const q      = listQuerySchema.parse(req.query)

  // Where: notifications của user này HOẶC broadcast (user_id NULL)
  const baseWhere: Prisma.NotificationWhereInput = {
    OR: [
      { userId },
      { userId: null },
    ],
  }

  // Filter unread: NOT EXISTS read by me
  const where: Prisma.NotificationWhereInput = q.unreadOnly
    ? {
        AND: [
          baseWhere,
          { reads: { none: { userId } } },
        ],
      }
    : baseWhere

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    q.limit,
      skip:    q.offset,
      include: {
        reads: { where: { userId } },  // include only the current user's read row
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        AND: [baseWhere, { reads: { none: { userId } } }],
      },
    }),
  ])

  res.json({
    notifications: rows.map(r => shape(r, userId)),
    total,
    unread,
    limit:  q.limit,
    offset: q.offset,
  })
}

// =====================================================================
// POST /api/notifications/:id/read
// =====================================================================

export async function markRead(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const id     = BigInt(req.params.id)

  const n = await prisma.notification.findUnique({ where: { id } })
  if (!n) throw NotFound('notification.not_found')

  // Upsert per-user read row
  await prisma.notificationRead.upsert({
    where:  { notificationId_userId: { notificationId: id, userId } },
    create: { notificationId: id, userId },
    update: {},  // đã có thì giữ readAt cũ
  })
  res.json({ ok: true })
}

// =====================================================================
// POST /api/notifications/read-all
// =====================================================================

export async function markAllRead(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)

  // Lấy tất cả notification có thể read (user mình hoặc broadcast) và chưa read
  const unread = await prisma.notification.findMany({
    where: {
      AND: [
        { OR: [{ userId }, { userId: null }] },
        { reads: { none: { userId } } },
      ],
    },
    select: { id: true },
  })

  if (unread.length === 0) {
    res.json({ ok: true, marked: 0 })
    return
  }

  // Bulk insert
  await prisma.notificationRead.createMany({
    data: unread.map(n => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  })
  res.json({ ok: true, marked: unread.length })
}

// =====================================================================
// GET /api/notifications/unread-count
// =====================================================================

export async function unreadCount(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const count = await prisma.notification.count({
    where: {
      AND: [
        { OR: [{ userId }, { userId: null }] },
        { reads: { none: { userId } } },
      ],
    },
  })
  res.json({ count })
}
