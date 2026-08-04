import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFound } from '@/lib/errors'
import { computeStoreStatus } from '@/lib/storeStatus'

function num(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null
  return Number(v)
}

export async function info(_req: Request, res: Response) {
  const s = await prisma.storeSettings.findUnique({ where: { id: 1 } })
  if (!s) throw NotFound('common.not_found')

  const status = computeStoreStatus(s.isOpen, s.openHoursJson)

  res.json({
    name:    s.name,
    hotline: s.hotline,
    email:   s.email,
    address: s.address,
    lat:     num(s.lat),
    lng:     num(s.lng),
    openHours:       s.openHoursJson,
    isOpen:          s.isOpen,
    closedMessage:   s.closedMessage,
    // Trạng thái nhận đơn hiệu lực (isOpen + giờ mở cửa). FE cũng tự tính lại
    // theo thời gian thực để không bị stale do cache.
    acceptingOrders: status.acceptingOrders,
    closedReason:    status.closedReason,
    delivery: {
      radiusKm:             num(s.deliveryRadiusKm),
      baseFee:              num(s.deliveryBaseFee),
      perKm:                num(s.deliveryPerKm),
      freeShipThreshold:    num(s.freeShipThreshold),
      freeDeliveryRadiusKm: num(s.freeDeliveryRadiusKm),
      feeMode:              s.deliveryFeeMode === 'flat' ? 'flat' : 'per_km',
      flatFee:              num(s.deliveryFlatFee),
      kitchenPrepMinutes:   s.kitchenPrepMinutes,
    },
    payment: {
      methods: [
        'cash_on_delivery',
        s.paypalEmail || s.paypalMeLink ? 'paypal'        : null,
        // Bank transfer khả dụng khi có SỐ TÀI KHOẢN (QR chỉ là tùy chọn hiển thị)
        s.bankQrImageUrl || s.bankAccountNo ? 'bank_qr_image' : null,
      ].filter(Boolean),
      paypalMeLink:    s.paypalMeLink,
      bankQrImageUrl:  s.bankQrImageUrl,
      bankAccountName: s.bankAccountName,
      bankAccountNo:   s.bankAccountNo,
      bankName:        s.bankName,
    },
    currency: s.defaultCurrency,
  })
}
