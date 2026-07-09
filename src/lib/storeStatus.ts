// Bản mirror của backend/src/lib/storeStatus.ts cho phía client.
// FE tự tính lại theo thời gian thực (Europe/Berlin) để không bị stale do cache
// của storeApi. BE vẫn enforce lúc tạo đơn — đây chỉ là UX (banner + khoá nút).

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type ClosedReason = 'manual' | 'off_hours' | null

export interface StoreStatus {
  acceptingOrders: boolean
  closedReason:    ClosedReason
}

const WEEKDAY_MAP: Record<string, Day> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
}

function nowInBerlin(now: Date): { day: Day; hhmm: string } {
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

export function isWithinOpeningHours(openHours: unknown, now: Date = new Date()): boolean {
  if (!openHours || typeof openHours !== 'object') return true
  const { day, hhmm } = nowInBerlin(now)
  const today = (openHours as Record<string, unknown>)[day]
  if (!Array.isArray(today) || today.length !== 2) return false
  const [open, close] = today
  if (typeof open !== 'string' || typeof close !== 'string') return false
  if (close > open) return open <= hhmm && hhmm < close
  return hhmm >= open || hhmm < close
}

export function computeStoreStatus(
  isOpen: boolean,
  openHours: unknown,
  now: Date = new Date(),
): StoreStatus {
  if (!isOpen) return { acceptingOrders: false, closedReason: 'manual' }
  if (!isWithinOpeningHours(openHours, now)) return { acceptingOrders: false, closedReason: 'off_hours' }
  return { acceptingOrders: true, closedReason: null }
}
