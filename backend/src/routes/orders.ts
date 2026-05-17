import { Router } from 'express'
import * as ordersApi from '@/api/orders.api'
import {
  requireAuth,
  requireRole,
  attachUserIfPresent,
  attachGuestIfPresent,
  requireAuthOrGuest,
} from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

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
  requireRole('staff', 'admin'),
  ah(ordersApi.listForAdmin),
)

// GET /api/orders/:code — access check trong handler (owner / staff / admin / guest token khớp)
ordersRouter.get(
  '/:code',
  attachUserIfPresent,
  attachGuestIfPresent,
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
  requireRole('staff', 'admin'),
  ah(ordersApi.changeStatus),
)

// PATCH /api/orders/:code — admin edit limited fields
ordersRouter.patch(
  '/:code',
  requireAuth,
  requireRole('admin'),
  ah(ordersApi.adminUpdateOrder),
)

// DELETE /api/orders/:code — soft cancel (admin từ mọi state; staff bị giới hạn)
ordersRouter.delete(
  '/:code',
  requireAuth,
  requireRole('staff', 'admin'),
  ah(ordersApi.adminCancelOrder),
)
