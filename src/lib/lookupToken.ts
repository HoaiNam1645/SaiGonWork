/**
 * Lookup token: cấp sau khi guest verify OTP với purpose='order_lookup'.
 * TTL backend 7 ngày. Lưu localStorage để guest không phải verify lại trong tuần.
 * Token hết hạn → BE trả 401/403 → page tự clear + bắt OTP lại.
 */

const KEY       = 'sgw-lookup-token'
const EMAIL_KEY = 'sgw-lookup-email'

export function saveLookupSession(email: string, token: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, token)
    localStorage.setItem(EMAIL_KEY, email)
  } catch { /* ignore */ }
}

export function readLookupToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function readLookupEmail(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(EMAIL_KEY) } catch { return null }
}

export function clearLookupSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(EMAIL_KEY)
  } catch { /* ignore */ }
}
