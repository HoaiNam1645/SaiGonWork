import { Router } from 'express'
import * as storeApi from '@/api/store.api'
import { ah } from '@/lib/asyncHandler'

export const storeRouter = Router()

storeRouter.get('/', ah(storeApi.info))
