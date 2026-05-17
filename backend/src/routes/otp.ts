import { Router } from 'express'
import * as otpApi from '@/api/otp.api'
import { ah } from '@/lib/asyncHandler'
import { otpSendLimiter, otpVerifyLimiter } from '@/middleware/rateLimit'

export const otpRouter = Router()

otpRouter.post('/send',   otpSendLimiter,   ah(otpApi.send))
otpRouter.post('/verify', otpVerifyLimiter, ah(otpApi.verify))
