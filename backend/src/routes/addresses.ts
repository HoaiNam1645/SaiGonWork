import { Router } from 'express'
import * as addressesApi from '@/api/addresses.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

export const addressesRouter = Router()

addressesRouter.use(requireAuth)

addressesRouter.get   ('/',             ah(addressesApi.list))
addressesRouter.post  ('/',             ah(addressesApi.create))
addressesRouter.patch ('/:id',          ah(addressesApi.update))
addressesRouter.delete('/:id',          ah(addressesApi.remove))
addressesRouter.post  ('/:id/default',  ah(addressesApi.setDefault))
