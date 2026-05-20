'use client'

import { useEffect, useRef, useState } from 'react'
import { io as ioClient, type Socket } from 'socket.io-client'

// =====================================================================
// Types (mirror BE lib/socket.ts)
// =====================================================================

export interface OrderCreatedPayload {
  id:               string
  code:             string
  total:            number
  currency:         string
  status:           'pending_payment' | 'paid' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
  paymentMethod:    'cash_on_delivery' | 'paypal' | 'bank_qr_image'
  bankTxId:         string | null
  contactName:      string
  contactPhone:     string
  contactEmail:     string
  itemCount:        number
  subtotal:         number
  deliveryFee:      number
  distanceKm:       number | null
  createdAt:        string
  isGuest:          boolean
}

export interface OrderStatusChangedPayload {
  code: string
  from: string | null
  to:   string
  at:   string
}

export type NotificationType =
  | 'order_created'
  | 'order_status_changed'
  | 'order_cancelled'
  | 'payment_received'
  | 'low_stock'
  | 'new_customer'
  | 'system'

export interface NotificationPayload {
  id:         string
  userId:     string | null
  type:       NotificationType
  metadata:   Record<string, unknown> | null
  entityType: string | null
  entityId:   string | null
  actionUrl:  string | null
  createdAt:  string
  isRead:     boolean
  readAt?:    string | null
}

// =====================================================================
// Socket singleton
// =====================================================================

const SOCKET_URL = (() => {
  const direct = process.env.NEXT_PUBLIC_SOCKET_URL
  if (direct) return direct
  const derived = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '')
  if (derived) return derived
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[socket] NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_API_URL is required for production build.',
    )
  }
  return 'http://localhost:4000'
})()

let _socket: Socket | null = null

export function getSocket(guestToken?: string): Socket {
  // Đã tồn tại → reuse (1 connection per tab)
  if (_socket?.connected || _socket?.active) return _socket
  _socket = ioClient(SOCKET_URL, {
    withCredentials: true,
    auth: guestToken ? { guestToken } : {},
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })
  return _socket
}

export function disconnectSocket(): void {
  _socket?.disconnect()
  _socket = null
}

// =====================================================================
// React hook — staff/admin orders feed
// =====================================================================

interface UseStaffOrdersResult {
  connected:  boolean
  joined:     boolean
  joinReason: string | null
}

interface UseStaffOrdersOptions {
  onCreated?:       (p: OrderCreatedPayload) => void
  onStatusChanged?: (p: OrderStatusChangedPayload) => void
  onNotification?:  (p: NotificationPayload) => void
}

/**
 * Connect, join `staff:orders` room, listen for `order.created` + `order.status_changed`.
 * Trả về connection flags để UI hiển thị badge live/reconnecting/offline.
 *
 * Callbacks được giữ qua ref nên không cần ổn định identity ở caller.
 */
export function useStaffOrdersSocket(opts: UseStaffOrdersOptions): UseStaffOrdersResult {
  const [connected,  setConnected]  = useState(false)
  const [joined,     setJoined]     = useState(false)
  const [joinReason, setJoinReason] = useState<string | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const s = getSocket()

    function onConnect() {
      setConnected(true)
      s.emit('join:staff')
    }
    function onDisconnect() {
      setConnected(false)
      setJoined(false)
    }
    function onJoinedStaff(ack: { ok: boolean; reason?: string }) {
      setJoined(ack.ok)
      setJoinReason(ack.ok ? null : (ack.reason ?? 'unknown'))
    }
    function onOrderCreated(payload: OrderCreatedPayload) {
      optsRef.current.onCreated?.(payload)
    }
    function onOrderStatusChanged(payload: OrderStatusChangedPayload) {
      optsRef.current.onStatusChanged?.(payload)
    }
    function onNotificationCreated(payload: NotificationPayload) {
      optsRef.current.onNotification?.(payload)
    }

    if (s.connected) onConnect()
    s.on('connect',              onConnect)
    s.on('disconnect',           onDisconnect)
    s.on('joined:staff',         onJoinedStaff)
    s.on('order.created',        onOrderCreated)
    s.on('order.status_changed', onOrderStatusChanged)
    s.on('notification.created', onNotificationCreated)

    return () => {
      s.off('connect',              onConnect)
      s.off('disconnect',           onDisconnect)
      s.off('joined:staff',         onJoinedStaff)
      s.off('order.created',        onOrderCreated)
      s.off('order.status_changed', onOrderStatusChanged)
      s.off('notification.created', onNotificationCreated)
    }
  }, [])

  return { connected, joined, joinReason }
}
