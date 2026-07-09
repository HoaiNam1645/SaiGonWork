// =====================================================================
// Trạng thái nhận đơn của cửa hàng — kết hợp công tắc thủ công (isOpen) và
// giờ mở cửa (openHoursJson). Tính theo múi giờ Âu (Europe/Berlin) để đúng
// bất kể server/khách ở đâu.
//
//   acceptingOrders = isOpen && đang-trong-giờ-mở-cửa
//
// Không dùng cron: trạng thái được TÍNH TRỰC TIẾP mỗi lần cần → cửa hàng tự
// ngưng nhận đơn khi tới giờ đóng, tự mở lại khi tới giờ mở. Công tắc isOpen
// là override thủ công (nghỉ lễ/khẩn cấp) đè lên lịch.
// =====================================================================

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type ClosedReason = 'manual' | 'off_hours' | null

export interface StoreStatus {
  acceptingOrders: boolean
  closedReason:    ClosedReason
}

const WEEKDAY_MAP: Record<string, Day> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
}

/** Ngày trong tuần + "HH:MM" hiện tại theo giờ Europe/Berlin. */
export function nowInBerlin(now: Date = new Date()): { day: Day; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone:  'Europe/Berlin',
    weekday:   'short',
    hour:      '2-digit',
    minute:    '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const wd = parts.find(p => p.type === 'weekday')?.value ?? 'Mon'
  const hh = parts.find(p => p.type === 'hour')?.value   ?? '00'
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00'
  return { day: WEEKDAY_MAP[wd] ?? 'mon', hhmm: `${hh}:${mm}` }
}

/**
 * Có đang trong giờ mở cửa không.
 * - openHours không hợp lệ / rỗng → trả `true` (không chặn theo giờ, chỉ dựa isOpen).
 * - Ngày đóng cửa (null) → `false`.
 * - Hỗ trợ ca qua đêm (close <= open).
 */
export function isWithinOpeningHours(openHours: unknown, now: Date = new Date()): boolean {
  if (!openHours || typeof openHours !== 'object') return true
  const { day, hhmm } = nowInBerlin(now)
  const today = (openHours as Record<string, unknown>)[day]
  if (!Array.isArray(today) || today.length !== 2) return false
  const [open, close] = today
  if (typeof open !== 'string' || typeof close !== 'string') return false
  // So sánh chuỗi "HH:MM" zero-pad là đúng thứ tự thời gian.
  if (close > open) return open <= hhmm && hhmm < close
  return hhmm >= open || hhmm < close // ca qua đêm (vd 18:00–02:00)
}

/** Trạng thái nhận đơn tổng hợp. */
export function computeStoreStatus(
  isOpen: boolean,
  openHours: unknown,
  now: Date = new Date(),
): StoreStatus {
  if (!isOpen) return { acceptingOrders: false, closedReason: 'manual' }
  if (!isWithinOpeningHours(openHours, now)) return { acceptingOrders: false, closedReason: 'off_hours' }
  return { acceptingOrders: true, closedReason: null }
}
