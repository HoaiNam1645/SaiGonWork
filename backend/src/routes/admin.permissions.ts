import { Router } from 'express'
import * as api from '@/api/admin.permissions.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

definePermission('permissions.list', {
  method: 'GET', path: '/api/admin/permissions',
  module: 'rbac', description: 'Xem danh sách permission keys',
})
definePermission('permissions.sync', {
  method: 'POST', path: '/api/admin/permissions/sync',
  module: 'rbac', description: 'Sync registry → DB thủ công',
})

export const adminPermissionsRouter = Router()

adminPermissionsRouter.use(requireAuth)   // Permission check ở từng route

adminPermissionsRouter.get ('/',     requirePermission('permissions.list'), ah(api.list))
adminPermissionsRouter.post('/sync', requirePermission('permissions.sync'), ah(api.sync))
