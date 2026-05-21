import { Router } from 'express'
import * as api from '@/api/admin.staff.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

definePermission('staff.list', {
  method: 'GET', path: '/api/admin/staff',
  module: 'staff', description: 'Xem danh sách nhân viên',
})
definePermission('staff.create', {
  method: 'POST', path: '/api/admin/staff',
  module: 'staff', description: 'Tạo nhân viên mới',
})
definePermission('staff.update', {
  method: 'PATCH', path: '/api/admin/staff/:id',
  module: 'staff', description: 'Sửa thông tin nhân viên',
})
definePermission('staff.change_role', {
  method: 'POST', path: '/api/admin/staff/:id/role',
  module: 'staff', description: 'Đổi role nhân viên',
})
definePermission('staff.activate', {
  method: 'POST', path: '/api/admin/staff/:id/activate',
  module: 'staff', description: 'Kích hoạt nhân viên',
})
definePermission('staff.deactivate', {
  method: 'POST', path: '/api/admin/staff/:id/deactivate',
  module: 'staff', description: 'Vô hiệu hóa nhân viên',
})
definePermission('staff.reset_password', {
  method: 'POST', path: '/api/admin/staff/:id/reset-password',
  module: 'staff', description: 'Reset mật khẩu nhân viên',
})

export const adminStaffRouter = Router()

// Permission check ở từng route
adminStaffRouter.use(requireAuth)

adminStaffRouter.get   ('/',                   requirePermission('staff.list'),           ah(api.list))
adminStaffRouter.post  ('/',                   requirePermission('staff.create'),         ah(api.create))
adminStaffRouter.patch ('/:id',                requirePermission('staff.update'),         ah(api.update))
adminStaffRouter.post  ('/:id/role',           requirePermission('staff.change_role'),    ah(api.changeRole))
adminStaffRouter.post  ('/:id/activate',       requirePermission('staff.activate'),       ah(api.activate))
adminStaffRouter.post  ('/:id/deactivate',     requirePermission('staff.deactivate'),     ah(api.deactivate))
adminStaffRouter.post  ('/:id/reset-password', requirePermission('staff.reset_password'), ah(api.resetPassword))
