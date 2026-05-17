import { Router } from 'express'
import * as healthApi from '@/api/health.api'
import { ah } from '@/lib/asyncHandler'

export const healthRouter = Router()

healthRouter.get('/',    healthApi.status)
healthRouter.get('/db',  ah(healthApi.db))
