import { Router } from 'express'
import * as api from '@/api/admin.customers.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const adminCustomersRouter = Router()

// Customer list/detail — admin only (theo FEATURES.md §6.4)
adminCustomersRouter.use(requireAuth, requireRole('admin'))

adminCustomersRouter.get   ('/',                       ah(api.listCustomers))
adminCustomersRouter.get   ('/:id',                    ah(api.getCustomer))
adminCustomersRouter.patch ('/:id',                    ah(api.updateCustomer))
adminCustomersRouter.post  ('/:id/activate',           ah(api.activateCustomer))
adminCustomersRouter.post  ('/:id/deactivate',         ah(api.deactivateCustomer))
adminCustomersRouter.post  ('/:id/reset-password',     ah(api.resetCustomerPassword))
