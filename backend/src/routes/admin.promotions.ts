import { Router } from 'express'
import * as api from '@/api/admin.promotions.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

definePermission('promotions.list',   { method: 'GET',    path: '/api/admin/promotions',          module: 'promotions', description: 'Xem danh sách promotion' })
definePermission('promotions.create', { method: 'POST',   path: '/api/admin/promotions',          module: 'promotions', description: 'Tạo promotion mới' })
definePermission('promotions.read',   { method: 'GET',    path: '/api/admin/promotions/:id',      module: 'promotions', description: 'Xem chi tiết promotion' })
definePermission('promotions.update', { method: 'PATCH',  path: '/api/admin/promotions/:id',      module: 'promotions', description: 'Sửa promotion' })
definePermission('promotions.toggle', { method: 'POST',   path: '/api/admin/promotions/:id/toggle', module: 'promotions', description: 'Bật/tắt promotion' })
definePermission('promotions.delete', { method: 'DELETE', path: '/api/admin/promotions/:id',      module: 'promotions', description: 'Xóa promotion' })

export const adminPromotionsRouter = Router()

adminPromotionsRouter.use(requireAuth)   // Permission check ở từng route

adminPromotionsRouter.get   ('/',            requirePermission('promotions.list'),   ah(api.list))
adminPromotionsRouter.post  ('/',            requirePermission('promotions.create'), ah(api.create))
adminPromotionsRouter.get   ('/:id',         requirePermission('promotions.read'),   ah(api.getOne))
adminPromotionsRouter.patch ('/:id',         requirePermission('promotions.update'), ah(api.update))
adminPromotionsRouter.post  ('/:id/toggle',  requirePermission('promotions.toggle'), ah(api.toggle))
adminPromotionsRouter.delete('/:id',         requirePermission('promotions.delete'), ah(api.remove))
