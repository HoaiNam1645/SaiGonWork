import { env } from '@/config/env'

/**
 * Telegram notifier — bắn tin vào group khi có sự kiện (đơn mới).
 *
 * Cấu hình qua env (thiếu 1 trong 2 → tự TẮT im lặng, không ảnh hưởng gì):
 *   TELEGRAM_BOT_TOKEN — token từ @BotFather
 *   TELEGRAM_CHAT_ID   — chat id của group (âm, vd -1001234567890).
 *                        Lấy bằng cách add bot vào group rồi gọi getUpdates.
 *
 * Mọi hàm ở đây fire-and-forget: KHÔNG throw, KHÔNG block luồng đặt hàng.
 * Test nhanh sau khi điền key: npx tsx scripts/testTelegram.ts
 */

const API_TIMEOUT_MS = 10_000

export function isTelegramEnabled(): boolean {
  return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
}

/** Escape HTML cho parse_mode=HTML (tên khách là input người dùng). */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Gửi 1 tin nhắn tới group đã cấu hình. Trả về true nếu Telegram nhận.
 * Không bao giờ throw — lỗi chỉ log warn.
 */
export async function sendTelegramMessage(html: string): Promise<boolean> {
  if (!isTelegramEnabled()) return false
  try {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS)
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:                  env.TELEGRAM_CHAT_ID,
          text:                     html,
          parse_mode:               'HTML',
          disable_web_page_preview: true,
        }),
        signal: ctrl.signal,
      },
    )
    clearTimeout(timer)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[telegram] sendMessage failed: HTTP ${res.status} ${body.slice(0, 200)}`)
      return false
    }
    return true
  } catch (e) {
    console.warn('[telegram] sendMessage error:', e instanceof Error ? e.message : e)
    return false
  }
}

// ---- Đơn hàng mới ----

const STATUS_VI: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  paid:            'Đã thanh toán',
  preparing:       'Đang chuẩn bị',
  delivering:      'Đang giao',
  completed:       'Hoàn thành',
  cancelled:       'Đã huỷ',
}

function formatBerlinTime(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d)
}

export interface NewOrderInfo {
  code:        string
  contactName: string
  contactPhone: string
  total:       number
  status:      string
  createdAt:   Date
}

/** Bắn thông báo đơn mới vào group — fire-and-forget (gọi không cần await). */
export function notifyTelegramNewOrder(o: NewOrderInfo): void {
  if (!isTelegramEnabled()) return
  const url    = `${env.PUBLIC_APP_URL}/admin/orders/${encodeURIComponent(o.code)}`
  const status = STATUS_VI[o.status] ?? o.status
  const total  = `${o.total.toFixed(2).replace('.', ',')} €`
  const text = [
    `🔔 Có đơn hàng mới của <b>${esc(o.contactName)}</b> (${esc(o.contactPhone)})`,
    `🕐 Đặt vào lúc: ${formatBerlinTime(o.createdAt)} (giờ Đức)`,
    `📦 Trạng thái đơn hàng: <b>${esc(status)}</b> · Tổng: <b>${total}</b>`,
    `👉 Vui lòng kiểm tra: ${url}`,
  ].join('\n')
  void sendTelegramMessage(text)
}
