import { Router } from 'express'
import * as categoriesApi from '@/api/categories.api'
import { ah } from '@/lib/asyncHandler'

export const categoriesRouter = Router()

categoriesRouter.get('/', ah(categoriesApi.list))
