/**
 * Test cấu hình Telegram sau khi điền TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID vào .env:
 *   npx tsx scripts/testTelegram.ts
 * Gửi 1 tin mẫu đúng format đơn mới vào group. Nhớ restart backend (pm2 restart
 * sgw-backend) sau khi đổi .env để server nhận key.
 */
import { isTelegramEnabled, notifyTelegramNewOrder, sendTelegramMessage } from '../src/lib/telegram'

async function main() {
  if (!isTelegramEnabled()) {
    console.log('✗ Telegram CHƯA cấu hình — điền TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID vào .env rồi chạy lại.')
    process.exit(1)
  }
  const ok = await sendTelegramMessage('✅ Sai Gon Wok — kết nối Telegram OK. Tin nhắn đơn mẫu bên dưới:')
  console.log(ok ? '✓ Gửi tin test OK' : '✗ Gửi thất bại — xem warn ở trên (token/chat_id sai?)')

  notifyTelegramNewOrder({
    code:         'SGW-2026-00000',
    contactName:  'Nguyễn Văn Test',
    contactPhone: '+49 711 241567',
    total:        26.30,
    status:       'pending_payment',
    createdAt:    new Date(),
  })
  // đợi fire-and-forget bay xong
  await new Promise(r => setTimeout(r, 3000))
  console.log('Xong — kiểm tra group Telegram.')
}

main()
