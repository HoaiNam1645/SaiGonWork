import { promises as dnsPromises } from 'dns'
import disposableList from 'disposable-email-domains'
import mailchecker from 'mailchecker'
import { env } from '@/config/env'

// ---------- Static blacklists (load 1 lần khi module init) ----------

const builtInDisposable = new Set(disposableList.map(d => d.toLowerCase()))

const customBlacklist = new Set(
  env.DISPOSABLE_EMAIL_BLACKLIST
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
)

/** Domain bị quá nhiều spam thực tế trong app — bổ sung từ kinh nghiệm runtime. */
const knownBadDomains = new Set<string>([
  'anawebs.com',  // tempmail domain báo cáo bởi user
])

// ---------- API ----------

export interface DisposableCheckResult {
  isDisposable: boolean
  /** Source phát hiện — null nếu pass: 'mailchecker' | 'built_in' | 'custom' | 'known_bad' | 'no_mx' */
  source: string | null
}

function getDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0) return null
  return email.slice(at + 1).toLowerCase().trim() || null
}

/** Đồng bộ — chỉ tra các blacklist tĩnh. Không gọi DNS. */
export function checkDisposableSync(email: string): DisposableCheckResult {
  const domain = getDomain(email)
  if (!domain) return { isDisposable: false, source: null }

  if (knownBadDomains.has(domain))   return { isDisposable: true, source: 'known_bad' }
  if (customBlacklist.has(domain))   return { isDisposable: true, source: 'custom' }
  if (builtInDisposable.has(domain)) return { isDisposable: true, source: 'built_in' }

  // mailchecker.isValid trả false nếu email format sai HOẶC domain bị block.
  // Vì email format đã được Zod validate trước, false ở đây = domain bị block.
  if (!mailchecker.isValid(email)) return { isDisposable: true, source: 'mailchecker' }

  return { isDisposable: false, source: null }
}

/**
 * Bất đồng bộ — chạy check sync + (optional) DNS MX record lookup.
 * Domain không có MX record → không thể nhận email → coi như disposable.
 *
 * Cảnh báo: DNS lookup thêm 50-200ms latency. Chỉ bật ở route quan trọng
 * (register, change-email) qua env `DISPOSABLE_CHECK_MX=true`.
 */
export async function checkDisposable(email: string): Promise<DisposableCheckResult> {
  const sync = checkDisposableSync(email)
  if (sync.isDisposable) return sync

  if (!env.DISPOSABLE_CHECK_MX) return sync

  const domain = getDomain(email)
  if (!domain) return sync

  try {
    const records = await dnsPromises.resolveMx(domain)
    if (!records || records.length === 0) {
      return { isDisposable: true, source: 'no_mx' }
    }
  } catch (e) {
    // ENOTFOUND / ENODATA → domain không có MX → reject
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN') {
      return { isDisposable: true, source: 'no_mx' }
    }
    // Lỗi DNS khác (timeout, network) → không block để tránh false positive
    console.warn('[disposable] DNS lookup failed:', domain, code)
  }

  return { isDisposable: false, source: null }
}

/** Backward compatible — gọi đồng bộ. Dùng khi không cần MX check. */
export function isDisposableEmail(email: string): boolean {
  return checkDisposableSync(email).isDisposable
}

/**
 * Honeypot — input ẩn (display:none) trong form đăng ký.
 * Bot tự fill mọi field → sẽ điền vào đây. Nếu có giá trị, từ chối request.
 */
export function tripsHoneypot(body: Record<string, unknown> | undefined): boolean {
  if (!body) return false
  const trap = body.website
  return typeof trap === 'string' && trap.trim().length > 0
}
