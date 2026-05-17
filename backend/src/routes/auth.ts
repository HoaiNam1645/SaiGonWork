import { Router } from 'express'
import * as authApi from '@/api/auth.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { loginLimiter, refreshLimiter, registerLimiter } from '@/middleware/rateLimit'

export const authRouter = Router()

authRouter.post('/register',     registerLimiter, ah(authApi.register))
authRouter.post('/login',        loginLimiter,    ah(authApi.login))
authRouter.post('/logout',                            authApi.logout)
authRouter.post('/refresh',      refreshLimiter,  ah(authApi.refresh))
authRouter.get  ('/me',           requireAuth,     ah(authApi.me))
authRouter.patch('/me',           requireAuth,     ah(authApi.updateProfile))
authRouter.post ('/change-email', requireAuth,     registerLimiter, ah(authApi.changeEmail))
