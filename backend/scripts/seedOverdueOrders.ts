/**
 * Seed 5 đơn mỗi loại match 1 alert reason ở admin dashboard.
 *
 * Reasons:
 *   1. pending_payment_overdue  — pending_payment > 24h  (warning)
 *   2. paid_not_preparing       — paid, paidAt > 30m     (warning)
 *   3. preparing_overdue        — preparing > 45m        (warning)
 *   4. delivering_overdue       — delivering > 60m       (critical)
 *   5. scheduled_due_soon       — scheduledAt sắp tới    (critical)
 *
 * Idempotent: xóa orders có code prefix `ALERT-` trước khi insert.
 *
 * Chạy: cd backend && npx tsx scripts/seedOverdueOrders.ts
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const MINUTE = 60_000
const HOUR   = 60 * MINUTE

interface ScenarioInput {
  reason:         string
  status:         'pending_payment' | 'paid' | 'preparing' | 'delivering'
  createdAtAgoMs: number   // bao lâu trước now
  updatedAtAgoMs: number   // dùng làm proxy cho status-changed time
  paidAtAgoMs:    number | null
  scheduledAtIn:  number | null   // ms từ now (positive = tương lai)
}

const SCENARIOS: ScenarioInput[] = [
  {
    reason:         'pending_payment_overdue',
    status:         'pending_payment',
    createdAtAgoMs: 35 * MINUTE,
    updatedAtAgoMs: 35 * MINUTE,
    paidAtAgoMs:    null,
    scheduledAtIn:  null,
  },
  {
    reason:         'paid_not_preparing',
    status:         'paid',
    createdAtAgoMs: 50 * MINUTE,
    updatedAtAgoMs: 45 * MINUTE,
    paidAtAgoMs:    45 * MINUTE,
    scheduledAtIn:  null,
  },
  {
    reason:         'preparing_overdue',
    status:         'preparing',
    createdAtAgoMs: 90 * MINUTE,
    updatedAtAgoMs: 55 * MINUTE,
    paidAtAgoMs:    80 * MINUTE,
    scheduledAtIn:  null,
  },
  {
    reason:         'delivering_overdue',
    status:         'delivering',
    createdAtAgoMs: 3 * HOUR,
    updatedAtAgoMs: 75 * MINUTE,
    paidAtAgoMs:    2 * HOUR,
    scheduledAtIn:  null,
  },
  {
    reason:         'scheduled_due_soon',
    status:         'paid',
    createdAtAgoMs: 2 * HOUR,
    updatedAtAgoMs: 90 * MINUTE,
    paidAtAgoMs:    90 * MINUTE,
    scheduledAtIn:  25 * MINUTE,   // còn 25 phút tới scheduled_at, < kitchenPrep(25)+10 → trigger
  },
]

async function main() {
  // ─── Resolve test user + dish + store settings ───
  const userId = 3n
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error(`User id=${userId} không tồn tại. Sửa userId trong script hoặc seed user trước.`)

  const dish = await prisma.dish.findFirst({
    where:   { isAvailable: true },
    orderBy: { id: 'asc' },
  })
  if (!dish) throw new Error('Không có dish nào trong DB. Chạy npm run seed trước.')

  const addr = await prisma.address.findFirst({
    where:   { userId },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  })

  const addressSnapshot = {
    recipient:   addr?.recipient  ?? user.fullName,
    phone:       addr?.phone      ?? user.phone ?? '0000000000',
    line:        addr?.line       ?? 'Königstraße 1',
    ward:        null,
    district:    null,
    city:        addr?.city       ?? 'Stuttgart',
    country:     addr?.country    ?? 'DE',
    postal_code: addr?.postalCode ?? '70173',
    lat:         addr?.lat ? Number(addr.lat) : 48.7758,
    lng:         addr?.lng ? Number(addr.lng) : 9.1829,
    note:        null,
  }

  // ─── Cleanup orders cũ từ seed lần trước (idempotent) ───
  const existing = await prisma.order.findMany({
    where:  { code: { startsWith: 'ALERT-' } },
    select: { id: true, code: true },
  })
  if (existing.length > 0) {
    console.log(`🧹  Xóa ${existing.length} alert order cũ...`)
    await prisma.orderItem.deleteMany({ where: { orderId: { in: existing.map(o => o.id) } } })
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: existing.map(o => o.id) } } })
    await prisma.order.deleteMany({ where: { id: { in: existing.map(o => o.id) } } })
  }

  // ─── Tạo orders ───
  const now = Date.now()
  const unitPrice = new Prisma.Decimal(dish.price)
  const qty       = 2
  const subtotal  = unitPrice.mul(qty)
  const ship      = new Prisma.Decimal('3.50')
  const total     = subtotal.add(ship)

  console.log(`\n🌱  Seeding ${SCENARIOS.length} alert orders for user ${user.email}...\n`)

  for (let i = 0; i < SCENARIOS.length; i++) {
    const s = SCENARIOS[i]
    const createdAt = new Date(now - s.createdAtAgoMs)
    const updatedAt = new Date(now - s.updatedAtAgoMs)
    const paidAt    = s.paidAtAgoMs != null ? new Date(now - s.paidAtAgoMs)    : null
    const scheduledAt = s.scheduledAtIn  != null ? new Date(now + s.scheduledAtIn) : null
    const code = `ALERT-${s.reason.toUpperCase().slice(0, 6)}-${i + 1}`

    await prisma.order.create({
      data: {
        code,
        userId,
        contactName:     user.fullName,
        contactEmail:    user.email,
        contactPhone:    user.phone ?? '0000000000',
        emailVerifiedAt: createdAt,
        addressSnapshot: addressSnapshot as Prisma.InputJsonValue,
        subtotal,
        deliveryFee:     ship,
        distanceKm:      new Prisma.Decimal('2.50'),
        durationMinutes: 12,
        deliveryFeeBreakdown: {
          distance_km: 2.5, duration_minutes: 12, per_km: 1.0,
          base_fee: 1.0, free_ship_applied: false,
        } as Prisma.InputJsonValue,
        discount:        new Prisma.Decimal(0),
        total,
        currency:        'EUR',
        status:          s.status,
        paymentMethod:   'bank_qr_image',
        paidAt,
        customerNote:    `[seed ${s.reason}]`,
        estimatedReadyAt: new Date(createdAt.getTime() + 30 * MINUTE),
        scheduledAt,
        createdAt,
        updatedAt,
        items: {
          create: [{
            dishId:       dish.id,
            dishName:     dish.nameVi,
            dishImageUrl: dish.imageUrl,
            unitPrice,
            quantity:     qty,
            lineTotal:    subtotal,
          }],
        },
      },
    })
    console.log(`  ✓ ${code.padEnd(28)}  status=${s.status.padEnd(15)}  → triggers ${s.reason}`)
  }

  console.log(`\n✅  Done. Mở /admin/orders để xem modal cảnh báo.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
