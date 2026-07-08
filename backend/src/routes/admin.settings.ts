import { Router } from 'express'
import * as api from '@/api/admin.settings.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

definePermission('settings.read',   { method: 'GET', path: '/api/admin/store', module: 'settings', description: 'Xem cấu hình cửa hàng' })
definePermission('settings.update', { method: 'PUT', path: '/api/admin/store', module: 'settings', description: 'Sửa cấu hình cửa hàng (giao hàng, thanh toán, giờ mở)' })

export const adminSettingsRouter = Router()

adminSettingsRouter.use(requireAuth)

adminSettingsRouter.get('/', requirePermission('settings.read'),   ah(api.get))
adminSettingsRouter.put('/', requirePermission('settings.update'), ah(api.update))
