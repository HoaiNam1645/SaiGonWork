import type { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NotFound } from '@/lib/errors'

function num(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null
  return Number(v)
}

export async function info(_req: Request, res: Response) {
  const s = await prisma.storeSettings.findUnique({ where: { id: 1 } })
  if (!s) throw NotFound('common.not_found')

  res.json({
    name:    s.name,
    hotline: s.hotline,
    email:   s.email,
    address: s.address,
    lat:     num(s.lat),
    lng:     num(s.lng),
    openHours:     s.openHoursJson,
    isOpen:        s.isOpen,
    closedMessage: s.closedMessage,
    delivery: {
      radiusKm:           num(s.deliveryRadiusKm),
      baseFee:            num(s.deliveryBaseFee),
      perKm:              num(s.deliveryPerKm),
      freeShipThreshold:  num(s.freeShipThreshold),
      kitchenPrepMinutes: s.kitchenPrepMinutes,
    },
    payment: {
      methods: [
        'cash_on_delivery',
        s.paypalEmail || s.paypalMeLink ? 'paypal'        : null,
        s.bankQrImageUrl                ? 'bank_qr_image' : null,
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
