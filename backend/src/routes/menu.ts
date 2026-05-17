import { Router } from 'express'
import * as menuApi from '@/api/menu.api'
import { ah } from '@/lib/asyncHandler'

export const menuRouter = Router()

menuRouter.get('/', ah(menuApi.getMenu))
