import { Router } from 'express'
import * as api from '@/api/admin.promotions.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const adminPromotionsRouter = Router()

adminPromotionsRouter.use(requireAuth, requireRole('admin'))

adminPromotionsRouter.get   ('/',            ah(api.list))
adminPromotionsRouter.post  ('/',            ah(api.create))
adminPromotionsRouter.get   ('/:id',         ah(api.getOne))
adminPromotionsRouter.patch ('/:id',         ah(api.update))
adminPromotionsRouter.post  ('/:id/toggle',  ah(api.toggle))
adminPromotionsRouter.delete('/:id',         ah(api.remove))
