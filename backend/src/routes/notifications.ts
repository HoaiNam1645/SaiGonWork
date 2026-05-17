import { Router } from 'express'
import * as notifApi from '@/api/notifications.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const notificationsRouter = Router()

// Tất cả endpoint yêu cầu staff/admin. Customer notifications là V2.
notificationsRouter.use(requireAuth, requireRole('staff', 'admin'))

notificationsRouter.get ('/',              ah(notifApi.list))
notificationsRouter.get ('/unread-count',  ah(notifApi.unreadCount))
notificationsRouter.post('/read-all',      ah(notifApi.markAllRead))
notificationsRouter.post('/:id/read',      ah(notifApi.markRead))
