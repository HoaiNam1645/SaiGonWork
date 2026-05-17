import type { Prisma } from '@prisma/client'

export interface ItemForPricing {
  unitPrice: number
  quantity:  number
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function computeSubtotal(items: ItemForPricing[]): number {
  return round2(items.reduce((s, it) => s + it.unitPrice * it.quantity, 0))
}

export interface DeliveryFeeInput {
  distanceKm:        number
  subtotal:          number
  deliveryBaseFee:   number   // store_settings.deliveryBaseFee
  deliveryPerKm:     number   // store_settings.deliveryPerKm (vd 2 €/km)
  freeShipThreshold: number | null  // store_settings.freeShipThreshold
  radiusKm:          number   // store_settings.deliveryRadiusKm
}

export interface DeliveryFeeResult {
  fee:            number
  freeShipApplied: boolean
  outOfZone:       boolean
  breakdown: {
    distanceKm:        number
    perKm:             number
    baseFee:           number
    threshold:         number | null
    radiusKm:          number
    provider:          string   // 'osrm' default
  }
}

/**
 * Tính phí ship + breakdown để snapshot vào delivery_fee_breakdown.
 * Quy ước: round HALF-UP 2 chữ số sau dấu phẩy. Free ship NẾU subtotal ≥ threshold,
 * KHÔNG xét tới out-of-zone (out-of-zone ưu tiên hơn — reject đơn).
 */
export function computeDeliveryFee(input: DeliveryFeeInput, provider = 'osrm'): DeliveryFeeResult {
  const breakdown = {
    distanceKm: round2(input.distanceKm),
    perKm:      input.deliveryPerKm,
    baseFee:    input.deliveryBaseFee,
    threshold:  input.freeShipThreshold,
    radiusKm:   input.radiusKm,
    provider,
  }

  const outOfZone = input.distanceKm > input.radiusKm
  if (outOfZone) {
    return { fee: 0, freeShipApplied: false, outOfZone: true, breakdown }
  }

  if (input.freeShipThreshold !== null && input.subtotal >= input.freeShipThreshold) {
    return { fee: 0, freeShipApplied: true, outOfZone: false, breakdown }
  }

  const fee = round2(input.deliveryBaseFee + input.distanceKm * input.deliveryPerKm)
  return { fee, freeShipApplied: false, outOfZone: false, breakdown }
}

/** Decimal helper — Prisma Decimal vào Number an toàn. */
export function dec(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : Number(v)
}
