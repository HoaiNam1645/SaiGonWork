import { Router } from 'express'
import * as cartApi from '@/api/cart.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const cartRouter = Router()

// Tất cả endpoint yêu cầu customer/staff/admin đã login.
// Guest dùng localStorage; merge vào server qua POST /merge khi login.
cartRouter.use(requireAuth, requireRole('customer', 'staff', 'admin'))

cartRouter.get   ('/',                ah(cartApi.getCart))
cartRouter.post  ('/items',           ah(cartApi.addItem))
cartRouter.patch ('/items/:itemId',   ah(cartApi.updateItem))
cartRouter.delete('/items/:itemId',   ah(cartApi.deleteItem))
cartRouter.delete('/',                ah(cartApi.clearCart))
cartRouter.post  ('/merge',           ah(cartApi.mergeCart))
