// Track timestamp lần gửi OTP gần nhất per (email, purpose) trong localStorage
// để cooldown sống qua F5 / mở tab mới.

export const OTP_COOLDOWN_SECONDS = 60

const key = (email: string, purpose: string) => `sgw-otp-sent:${email}:${purpose}`

export function markOtpSent(email: string, purpose: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key(email, purpose), String(Date.now()))
  } catch {}
}

export function getOtpCooldownRemaining(email: string, purpose: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const ts = localStorage.getItem(key(email, purpose))
    if (!ts) return 0
    const elapsed = Math.floor((Date.now() - parseInt(ts, 10)) / 1000)
    return Math.max(0, OTP_COOLDOWN_SECONDS - elapsed)
  } catch {
    return 0
  }
}

export function clearOtpSent(email: string, purpose: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key(email, purpose))
  } catch {}
}
