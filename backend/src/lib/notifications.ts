import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { emitNotificationCreated, type NotificationPayload } from '@/lib/socket'

export type NotificationType =
  | 'order_created'
  | 'order_status_changed'
  | 'order_cancelled'
  | 'payment_received'
  | 'low_stock'
  | 'new_customer'
  | 'system'

export interface CreateNotificationInput {
  /** NULL = broadcast cho mọi staff/admin */
  userId?:     bigint | null
  type:        NotificationType
  metadata?:   Record<string, unknown>
  entityType?: string
  entityId?:   bigint
  actionUrl?:  string
}

function shape(n: {
  id:         bigint
  userId:     bigint | null
  type:       string
  metadata:   Prisma.JsonValue | null
  entityType: string | null
  entityId:   bigint | null
  actionUrl:  string | null
  createdAt:  Date
}): NotificationPayload {
  return {
    id:         n.id.toString(),
    userId:     n.userId?.toString() ?? null,
    type:       n.type as NotificationType,
    metadata:   n.metadata as Record<string, unknown> | null,
    entityType: n.entityType,
    entityId:   n.entityId?.toString() ?? null,
    actionUrl:  n.actionUrl,
    createdAt:  n.createdAt.toISOString(),
    isRead:     false,  // mới tạo nên chưa ai read
  }
}

/**
 * Tạo 1 notification row + emit socket realtime tới staff:orders room.
 * Broadcast (userId=null) → mọi staff/admin connected sẽ nhận.
 * Personal (userId!=null) → only that user (future: cần user:{id} room).
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationPayload> {
  const created = await prisma.notification.create({
    data: {
      userId:     input.userId ?? null,
      type:       input.type,
      metadata:   input.metadata
                    ? (input.metadata as Prisma.InputJsonValue)
                    : Prisma.DbNull,
      entityType: input.entityType ?? null,
      entityId:   input.entityId   ?? null,
      actionUrl:  input.actionUrl  ?? null,
    },
  })
  const payload = shape(created)
  try { emitNotificationCreated(payload) } catch (e) {
    console.warn('[notifications] emit failed:', e)
  }
  return payload
}
