import { Router } from 'express'
import * as api from '@/api/admin.staff.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const adminStaffRouter = Router()

// Staff management — admin only (FEATURES.md §6.4)
adminStaffRouter.use(requireAuth, requireRole('admin'))

adminStaffRouter.get   ('/',                       ah(api.list))
adminStaffRouter.post  ('/',                       ah(api.create))
adminStaffRouter.patch ('/:id',                    ah(api.update))
adminStaffRouter.post  ('/:id/role',               ah(api.changeRole))
adminStaffRouter.post  ('/:id/activate',           ah(api.activate))
adminStaffRouter.post  ('/:id/deactivate',         ah(api.deactivate))
adminStaffRouter.post  ('/:id/reset-password',     ah(api.resetPassword))
