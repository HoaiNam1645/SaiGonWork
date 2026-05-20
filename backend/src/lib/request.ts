import type { Request } from 'express'
import os from 'os'
import { env } from '@/config/env'

export type IpType = 'loopback' | 'lan' | 'public' | 'unknown'

/** Đọc 1 header (string đầu tiên nếu Express trả array). */
function headerValue(req: Request, name: string): string | undefined {
  const v = req.headers[name]
  if (typeof v === 'string' && v.length > 0) return v.trim()
  if (Array.isArray(v) && v.length > 0)      return String(v[0]).trim()
  return undefined
}

export interface ClientInfo {
  /** IP đã normalize (strip ::ffff: prefix, không IPv4-mapped IPv6). Có thể undefined nếu request không có IP. */
  ip:              string | undefined
  /** IP raw trước khi normalize (vd `::ffff:127.0.0.1`). */
  ipRaw:           string | undefined
  /** Phân loại: loopback (::1, 127.*), lan (RFC 1918, link-local), public, unknown. */
  ipType:          IpType
  /** True nếu loopback hoặc lan — request không phải từ internet. */
  isLocal:         boolean
  /** Chuỗi X-Forwarded-For đầy đủ (proxy chain). Null nếu không có header. */
  forwardedChain:  string[] | null
  /** IP của Express thấy (req.ip — đã trust proxy). */
  expressIp:       string | undefined
  /** Connection remoteAddress thuần (bypass proxy). */
  remoteAddress:   string | undefined
  userAgent:       string | undefined
}

/** Strip prefix IPv4-mapped IPv6 → IPv4 thuần. */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}

/** Classify IP theo RFC 1918 (private) + loopback + link-local + ULA. */
export function classifyIp(ip: string | undefined): IpType {
  if (!ip) return 'unknown'
  const v = ip.toLowerCase()

  // IPv6 loopback
  if (v === '::1') return 'loopback'
  // IPv4 loopback 127.0.0.0/8
  if (v.startsWith('127.')) return 'loopback'

  // IPv4 RFC 1918 private
  if (v.startsWith('10.')) return 'lan'
  if (v.startsWith('192.168.')) return 'lan'
  const m = v.match(/^172\.(\d+)\./)
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return 'lan'

  // IPv4 link-local 169.254.0.0/16
  if (v.startsWith('169.254.')) return 'lan'

  // IPv6 link-local fe80::/10 và Unique Local fc00::/7
  if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return 'lan'
  if (v.startsWith('fc') || v.startsWith('fd')) return 'lan'

  return 'public'
}

/** Lấy thông tin client request đầy đủ.
 *
 * Logic chống spoof:
 *  - `req.socket.remoteAddress` = hop trực tiếp gọi vào app, KHÔNG forge được.
 *  - Chỉ tin các header proxy (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
 *    khi socket nằm trong dải loopback/LAN → tức request đến từ reverse proxy
 *    thật (Nginx/Cloudflare tunnel) chứ không phải client trực tiếp gửi.
 *  - Nếu app exposed trực tiếp internet và attacker spoof header → ta IGNORE,
 *    dùng `socket.remoteAddress` làm IP thật.
 *  - Thứ tự ưu tiên khi đã trust: CF-Connecting-IP (nếu TRUST_CLOUDFLARE) >
 *    X-Real-IP > req.ip (Express handle XFF theo TRUST_PROXY) > remoteAddress.
 */
export function getClientInfo(req: Request): ClientInfo {
  const fwdHeader = req.headers['x-forwarded-for']
  const forwardedChain =
    typeof fwdHeader === 'string' && fwdHeader.length
      ? fwdHeader.split(',').map(s => s.trim()).filter(Boolean)
      : null

  const expressIp     = req.ip
  const remoteAddress = req.socket?.remoteAddress
  const remoteNorm    = remoteAddress ? normalizeIp(remoteAddress) : undefined

  // Request có thực sự đến từ trusted infra không?
  // (loopback = same-host proxy; LAN = private network proxy)
  const socketType  = classifyIp(remoteNorm)
  const fromProxy   = socketType === 'loopback' || socketType === 'lan'

  // Resolve IP theo priority — CHỈ tin header khi fromProxy=true
  let ipRaw: string | undefined
  if (fromProxy) {
    const cf = env.TRUST_CLOUDFLARE ? headerValue(req, 'cf-connecting-ip') : undefined
    const xr = headerValue(req, 'x-real-ip')
    ipRaw = cf ?? xr ?? expressIp ?? remoteNorm
  } else {
    // App bị gọi trực tiếp — bỏ qua mọi header forwarded, attacker có thể spoof
    ipRaw = remoteNorm
  }

  const ip      = ipRaw ? normalizeIp(ipRaw) : undefined
  const ipType  = classifyIp(ip)
  const isLocal = ipType === 'loopback' || ipType === 'lan'

  const ua = req.headers['user-agent']
  const userAgent = typeof ua === 'string' ? ua.slice(0, 255) : undefined

  return {
    ip,
    ipRaw,
    ipType,
    isLocal,
    forwardedChain,
    expressIp,
    remoteAddress: remoteNorm,
    userAgent,
  }
}

/** Backward compatible — chỉ trả IP string. */
export function clientIp(req: Request): string | undefined {
  return getClientInfo(req).ip
}

export function clientUserAgent(req: Request): string | undefined {
  return getClientInfo(req).userAgent
}

/**
 * Liệt kê các IP của host (network interfaces) — dùng cho debug,
 * giúp dev biết LAN IP để truy cập từ máy khác trong mạng.
 */
export function getHostNetworkInfo() {
  const ifaces = os.networkInterfaces()
  const addrs: Array<{ interface: string; address: string; family: string; internal: boolean }> = []
  for (const [name, list] of Object.entries(ifaces)) {
    if (!list) continue
    for (const i of list) {
      addrs.push({
        interface: name,
        address:   i.address,
        family:    i.family,
        internal:  i.internal,
      })
    }
  }
  return {
    hostname: os.hostname(),
    addresses: addrs,
  }
}
