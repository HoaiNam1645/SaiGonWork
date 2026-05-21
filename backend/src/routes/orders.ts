import { Router } from 'express'
import * as ordersApi from '@/api/orders.api'
import {
  requireAuth,
  attachUserIfPresent,
  attachGuestIfPresent,
  attachLookupIfPresent,
  requireAuthOrGuest,
  requireLookup,
} from '@/middleware/auth'
import { lookupCheckLimiter } from '@/middleware/rateLimit'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

// ──────────────────────────────────────────────────────────────────────
// Permission registry — chỉ wrap các endpoint admin/staff. Endpoint
// customer/guest dùng auth check riêng (requireAuth / requireAuthOrGuest).
// ──────────────────────────────────────────────────────────────────────
definePermission('orders.admin.list', {
  method: 'GET', path: '/api/orders/admin/list',
  module: 'orders', description: 'Xem danh sách đơn hàng (admin/staff)',
})
definePermission('orders.admin.overdue', {
  method: 'GET', path: '/api/orders/admin/overdue',
  module: 'orders', description: 'Xem cảnh báo đơn hàng quá hạn',
})
definePermission('orders.status.change', {
  method: 'POST', path: '/api/orders/:code/status',
  module: 'orders', description: 'Thay đổi trạng thái đơn hàng',
})
definePermission('orders.update', {
  method: 'PATCH', path: '/api/orders/:code',
  module: 'orders', description: 'Sửa thông tin đơn hàng (admin)',
})
definePermission('orders.cancel', {
  method: 'DELETE', path: '/api/orders/:code',
  module: 'orders', description: 'Hủy đơn hàng',
})

export const ordersRouter = Router()

// POST /api/orders — chấp nhận customer (JWT) hoặc guest (X-Guest-Token đã verify OTP)
ordersRouter.post(
  '/',
  attachUserIfPresent,
  attachGuestIfPresent,
  requireAuthOrGuest,
  ah(ordersApi.create),
)

// GET /api/orders/admin/list — staff/admin xem toàn bộ đơn (KHAI BÁO TRƯỚC /:code
// để Express không match nhầm 'admin' là order code).
ordersRouter.get(
  '/admin/list',
  requireAuth,
  requirePermission('orders.admin.list'),
  ah(ordersApi.listForAdmin),
)

// GET /api/orders/admin/overdue — pending_payment quá hạn 1 ngày, cho cảnh báo dashboard.
ordersRouter.get(
  '/admin/overdue',
  requireAuth,
  requirePermission('orders.admin.overdue'),
  ah(ordersApi.listOverduePending),
)

// POST /api/orders/lookup/check — pre-check email có đơn không, để guest không
// phải verify OTP rồi mới biết "không có đơn". Rate-limit per-IP chống enumerate.
ordersRouter.post(
  '/lookup/check',
  lookupCheckLimiter,
  ah(ordersApi.lookupCheck),
)

// POST /api/orders/promo/preview — preview discount cho checkout (guest hoặc customer)
ordersRouter.post(
  '/promo/preview',
  attachUserIfPresent,
  ah(ordersApi.previewPromotion),
)

// GET /api/orders/lookup — guest list orders theo email (cần X-Lookup-Token).
// Khai báo TRƯỚC /:code.
ordersRouter.get(
  '/lookup',
  attachLookupIfPresent,
  requireLookup,
  ah(ordersApi.listByLookup),
)

// GET /api/orders/:code — access check trong handler (owner / staff / admin /
// guest token khớp order / lookup token email khớp)
ordersRouter.get(
  '/:code',
  attachUserIfPresent,
  attachGuestIfPresent,
  attachLookupIfPresent,
  ah(ordersApi.getByCode),
)

// GET /api/orders — lịch sử đơn của customer login
ordersRouter.get('/', requireAuth, ah(ordersApi.listMine))

// =====================================================================
// Admin/staff order management
// =====================================================================

// POST /api/orders/:code/status — change status (staff/admin theo state machine)
ordersRouter.post(
  '/:code/status',
  requireAuth,
  requirePermission('orders.status.change'),
  ah(ordersApi.changeStatus),
)

// PATCH /api/orders/:code — admin edit limited fields
ordersRouter.patch(
  '/:code',
  requireAuth,
  requirePermission('orders.update'),
  ah(ordersApi.adminUpdateOrder),
)

// DELETE /api/orders/:code — soft cancel (admin từ mọi state; staff bị giới hạn)
ordersRouter.delete(
  '/:code',
  requireAuth,
  requirePermission('orders.cancel'),
  ah(ordersApi.adminCancelOrder),
)
