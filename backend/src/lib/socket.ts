/**
 * Singleton socket.io instance + emit helpers.
 *
 * Tách module riêng để tránh circular import giữa server.ts ↔ routes ↔ api handlers.
 * server.ts gọi setIo() ngay sau khi tạo SocketServer.
 */
import type { Server as SocketServer } from 'socket.io'

let _io: SocketServer | null = null

export function setIo(io: SocketServer): void {
  _io = io
}

export function getIo(): SocketServer | null {
  return _io
}

// =====================================================================
// Event payloads (mirror với FE)
// =====================================================================

export interface OrderCreatedItem {
  id:           string
  dishName:     string
  dishImageUrl: string | null
  quantity:     number
  unitPrice:    number
  lineTotal:    number
}

export interface OrderCreatedPayload {
  id:               string
  code:             string
  total:            number
  currency:         string
  status:           'pending_payment' | 'paid' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
  paymentMethod:    'cash_on_delivery' | 'paypal' | 'bank_qr_image'
  bankTxId:         string | null
  paymentProofUrl:  string | null
  contactName:      string
  contactPhone:     string
  contactEmail:     string
  itemCount:        number
  /** Chi tiết items để admin dashboard render thumbnail + tên ngay khi nhận socket
   *  (không phải F5 mới thấy). Mỗi item ~100 bytes, đơn 20 món ~2KB — chấp nhận được. */
  items:            OrderCreatedItem[]
  subtotal:         number
  deliveryFee:      number
  distanceKm:       number | null
  createdAt:        string  // ISO
  isGuest:          boolean
}

export interface OrderStatusChangedPayload {
  code:     string
  from:     string | null
  to:       string
  at:       string
}

export interface NotificationPayload {
  id:         string
  userId:     string | null
  type:       string
  metadata:   Record<string, unknown> | null
  entityType: string | null
  entityId:   string | null
  actionUrl:  string | null
  createdAt:  string
  isRead:     boolean
}

// =====================================================================
// Emit helpers — gọi từ API handlers
// =====================================================================

export function emitOrderCreated(payload: OrderCreatedPayload): void {
  _io?.to('staff:orders').emit('order.created', payload)
}

export function emitOrderStatusChanged(payload: OrderStatusChangedPayload): void {
  _io?.to('staff:orders').emit('order.status_changed', payload)
  _io?.to(`order:${payload.code}`).emit('order.status_changed', payload)
}

/**
 * Emit notification.created. Broadcast (userId null) → staff:orders room.
 * Personal (userId set) → user:{id} room (chưa setup, fallback staff:orders).
 */
export function emitNotificationCreated(payload: NotificationPayload): void {
  if (payload.userId) {
    _io?.to(`user:${payload.userId}`).emit('notification.created', payload)
  } else {
    _io?.to('staff:orders').emit('notification.created', payload)
  }
}
