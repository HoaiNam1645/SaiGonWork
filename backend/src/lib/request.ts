import type { Request } from 'express'
import os from 'os'

export type IpType = 'loopback' | 'lan' | 'public' | 'unknown'

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

/** Lấy thông tin client request đầy đủ. */
export function getClientInfo(req: Request): ClientInfo {
  // X-Forwarded-For có thể là chuỗi nhiều hop: "client, proxy1, proxy2"
  const fwdHeader = req.headers['x-forwarded-for']
  const forwardedChain =
    typeof fwdHeader === 'string' && fwdHeader.length
      ? fwdHeader.split(',').map(s => s.trim()).filter(Boolean)
      : null

  // Express's req.ip dùng trust proxy setting để chọn đúng IP từ chain
  const expressIp     = req.ip
  // Raw connection — IP của hop cuối (proxy hoặc client trực tiếp)
  const remoteAddress = req.socket?.remoteAddress

  // Ưu tiên: forwarded chain[0] (nếu trust proxy) > req.ip > remoteAddress
  const ipRaw = forwardedChain?.[0] ?? expressIp ?? remoteAddress ?? undefined
  const ip    = ipRaw ? normalizeIp(ipRaw) : undefined
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
    remoteAddress: remoteAddress ? normalizeIp(remoteAddress) : undefined,
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
