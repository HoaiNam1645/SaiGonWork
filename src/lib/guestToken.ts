/**
 * Lưu trữ guest token để truy cập đơn vãng lai sau khi tạo.
 *
 * 2 kind:
 *  - permanent (TTL 30 ngày, BE cấp sau khi tạo order): lưu localStorage theo orderCode
 *  - pending (TTL 30 phút, BE cấp sau khi verify OTP): chỉ giữ trong component state,
 *    không lưu LS — dùng 1 lần để submit order rồi vứt.
 */

const PREFIX = 'sgw-guest-token:'

export function saveOrderToken(orderCode: string, token: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PREFIX + orderCode, token) } catch { /* ignore quota */ }
}

export function readOrderToken(orderCode: string): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(PREFIX + orderCode) } catch { return null }
}

export function clearOrderToken(orderCode: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(PREFIX + orderCode) } catch { /* ignore */ }
}
