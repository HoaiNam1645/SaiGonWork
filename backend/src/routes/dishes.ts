import { Router } from 'express'
import * as dishesApi from '@/api/dishes.api'
import { ah } from '@/lib/asyncHandler'

export const dishesRouter = Router()

dishesRouter.get('/',      ah(dishesApi.list))
dishesRouter.get('/:slug', ah(dishesApi.detail))
