import { Router } from 'express'
import * as debugApi from '@/api/debug.api'

export const debugRouter = Router()

debugRouter.get('/whoami', debugApi.whoami)
