import { Router } from 'express'
import * as api from '@/api/admin.customers.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

definePermission('customers.list', {
  method: 'GET', path: '/api/admin/customers',
  module: 'customers', description: 'Xem danh sách khách hàng',
})
definePermission('customers.read', {
  method: 'GET', path: '/api/admin/customers/:id',
  module: 'customers', description: 'Xem chi tiết khách hàng',
})
definePermission('customers.update', {
  method: 'PATCH', path: '/api/admin/customers/:id',
  module: 'customers', description: 'Sửa thông tin khách hàng',
})
definePermission('customers.activate', {
  method: 'POST', path: '/api/admin/customers/:id/activate',
  module: 'customers', description: 'Kích hoạt khách hàng',
})
definePermission('customers.deactivate', {
  method: 'POST', path: '/api/admin/customers/:id/deactivate',
  module: 'customers', description: 'Vô hiệu hóa khách hàng',
})
definePermission('customers.reset_password', {
  method: 'POST', path: '/api/admin/customers/:id/reset-password',
  module: 'customers', description: 'Reset mật khẩu khách hàng',
})

export const adminCustomersRouter = Router()

// Permission check ở từng route
adminCustomersRouter.use(requireAuth)

adminCustomersRouter.get   ('/',                   requirePermission('customers.list'),           ah(api.listCustomers))
adminCustomersRouter.get   ('/:id',                requirePermission('customers.read'),           ah(api.getCustomer))
adminCustomersRouter.patch ('/:id',                requirePermission('customers.update'),         ah(api.updateCustomer))
adminCustomersRouter.post  ('/:id/activate',       requirePermission('customers.activate'),       ah(api.activateCustomer))
adminCustomersRouter.post  ('/:id/deactivate',     requirePermission('customers.deactivate'),     ah(api.deactivateCustomer))
adminCustomersRouter.post  ('/:id/reset-password', requirePermission('customers.reset_password'), ah(api.resetCustomerPassword))
