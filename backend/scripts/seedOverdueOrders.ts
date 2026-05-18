/**
 * One-off seed: tạo 3 đơn pending_payment quá hạn cho user id=3,
 * createdAt lùi 2/3/5 ngày so với mốc 2026-05-18 17:00 (giờ địa phương server).
 *
 * Chạy: cd backend && npx tsx scripts/seedOverdueOrders.ts
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 3n

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error(`User id=${userId} không tồn tại.`)

  const dish = await prisma.dish.findFirst({
    where:   { isAvailable: true },
    orderBy: { id: 'asc' },
  })
  if (!dish) throw new Error('Không có dish nào trong DB để gắn vào order.')

  const addr = await prisma.address.findFirst({
    where:   { userId },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  })

  const addressSnapshot = {
    recipient:   addr?.recipient   ?? user.fullName,
    phone:       addr?.phone       ?? user.phone ?? '',
    line:        addr?.line        ?? 'Königstraße 1',
    ward:        null,
    district:    null,
    city:        addr?.city        ?? 'Stuttgart',
    country:     addr?.country     ?? 'DE',
    postal_code: addr?.postalCode  ?? '70173',
    lat:         addr?.lat ? Number(addr.lat) : 48.7758,
    lng:         addr?.lng ? Number(addr.lng) : 9.1829,
    note:        null,
  }

  // Mốc "hiện tại" theo yêu cầu: 2026-05-18 17:00 local
  const NOW = new Date('2026-05-18T17:00:00')
  const daysAgo = [2, 3, 5]

  const unitPrice = new Prisma.Decimal(dish.price)
  const qty       = 2
  const subtotal  = unitPrice.mul(qty)
  const ship      = new Prisma.Decimal('3.50')
  const total     = subtotal.add(ship)

  for (let i = 0; i < daysAgo.length; i++) {
    const d   = daysAgo[i]
    const createdAt = new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000)
    const code = `OVR-${createdAt.getTime().toString(36).toUpperCase()}-${i + 1}`

    const created = await prisma.order.create({
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
        status:          'pending_payment',
        paymentMethod:   'bank_qr_image',
        customerNote:    `[seed overdue ${d}d]`,
        estimatedReadyAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        createdAt,
        updatedAt:       createdAt,
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
    console.log(`✓ ${created.code}  (createdAt=${createdAt.toISOString()}, total=${total.toString()} EUR)`)
  }

  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
