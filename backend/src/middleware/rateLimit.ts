import rateLimit, { type Options } from 'express-rate-limit'

/** Build limiter trả lỗi i18n-friendly. */
function buildLimiter(opts: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'TooManyRequests',
        message: req.t ? req.t('common.too_many_requests') : 'Too many requests',
      })
    },
    ...opts,
  })
}

// Đăng ký — 5 request / IP / 15 phút (chặn farm tạo account)
export const registerLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 5,
})

// Login — 10 lần / IP / 15 phút (chặn brute-force password)
export const loginLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 10,
})

// OTP send — 5 lần / IP / 15 phút (kết hợp với per-email cooldown trong otp.ts)
export const otpSendLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 5,
})

// OTP verify — 20 lần / IP / 15 phút (cao hơn để user nhập sai vài lần)
export const otpVerifyLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 20,
})

// Refresh token — 30 lần / IP / 15 phút
export const refreshLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 30,
})

// Order lookup precheck — 20 lần / IP / 15 phút.
// Endpoint chỉ trả yes/no (đỡ khó chịu cho guest), nhưng vẫn cần chống enumerate.
export const lookupCheckLimiter = buildLimiter({
  windowMs: 15 * 60_000,
  max: 20,
})
