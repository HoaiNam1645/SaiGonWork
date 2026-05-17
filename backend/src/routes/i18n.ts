import { Router } from 'express'
import * as i18nApi from '@/api/i18n.api'

export const i18nRouter = Router()

i18nRouter.get('/',         i18nApi.meta)
i18nRouter.get('/:locale',  i18nApi.dict)
