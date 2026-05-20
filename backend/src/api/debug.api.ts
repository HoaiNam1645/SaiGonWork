import type { Request, Response } from 'express'
import { env } from '@/config/env'
import { getClientInfo, getHostNetworkInfo } from '@/lib/request'
import { Forbidden } from '@/lib/errors'

/**
 * GET /api/debug/whoami — chỉ enable ở dev. Trả toàn bộ thông tin BE thấy về client
 * + network interfaces của host (giúp dev biết LAN IP để test từ máy khác).
 */
export function whoami(req: Request, res: Response) {
  if (env.NODE_ENV === 'production') {
    throw Forbidden('common.forbidden')
  }

  const info = getClientInfo(req)
  const host = getHostNetworkInfo()

  res.json({
    client: info,
    host,
    request: {
      method: req.method,
      path:   req.path,
      protocol: req.protocol,
      secure:   req.secure,
      headers: {
        'x-forwarded-for':   req.headers['x-forwarded-for']   ?? null,
        'x-forwarded-proto': req.headers['x-forwarded-proto'] ?? null,
        'x-real-ip':         req.headers['x-real-ip']         ?? null,
        'cf-connecting-ip':  req.headers['cf-connecting-ip']  ?? null,
        host:                req.headers.host                 ?? null,
        origin:              req.headers.origin               ?? null,
        referer:             req.headers.referer              ?? null,
      },
    },
    trustProxy:      req.app.get('trust proxy'),
    trustCloudflare: env.TRUST_CLOUDFLARE,
    locale:          req.locale,
  })
}
