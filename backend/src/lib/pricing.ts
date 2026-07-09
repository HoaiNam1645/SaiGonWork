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

export type DeliveryFeeMode = 'per_km' | 'flat'
export type FreeReason = 'subtotal' | 'distance' | null

export interface DeliveryFeeInput {
  distanceKm:           number
  subtotal:             number
  deliveryBaseFee:      number   // store_settings.deliveryBaseFee
  deliveryPerKm:        number   // store_settings.deliveryPerKm (vd 2 €/km)
  freeShipThreshold:    number | null  // store_settings.freeShipThreshold (free theo subtotal)
  radiusKm:             number   // store_settings.deliveryRadiusKm (ngoài vùng → reject)
  freeDeliveryRadiusKm: number   // distance < ngưỡng này → free (0 = tắt)
  deliveryFeeMode:      DeliveryFeeMode // 'per_km' | 'flat'
  deliveryFlatFee:      number   // phí cố định khi mode='flat'
}

export interface DeliveryFeeResult {
  fee:            number
  freeShipApplied: boolean
  outOfZone:       boolean
  freeReason:      FreeReason
  breakdown: {
    distanceKm:           number
    perKm:                number
    baseFee:              number
    threshold:            number | null
    radiusKm:             number
    freeDeliveryRadiusKm: number
    feeMode:              DeliveryFeeMode
    flatFee:              number
    freeReason:           FreeReason
    provider:             string   // 'osrm' default
  }
}

/**
 * Tính phí ship + breakdown để snapshot vào delivery_fee_breakdown.
 * Quy ước: round HALF-UP 2 chữ số. Thứ tự xét:
 *   1. Ngoài vùng (distance > radiusKm) → reject (ưu tiên cao nhất).
 *   2. Free nếu subtotal ≥ freeShipThreshold (free theo giá trị đơn).
 *   3. Free nếu distance < freeDeliveryRadiusKm (free theo khoảng cách).
 *   4. Còn lại: mode='flat' → deliveryFlatFee; mode='per_km' → baseFee + km*perKm.
 */
export function computeDeliveryFee(input: DeliveryFeeInput, provider = 'osrm'): DeliveryFeeResult {
  const mode: DeliveryFeeMode = input.deliveryFeeMode === 'flat' ? 'flat' : 'per_km'

  const mkBreakdown = (freeReason: FreeReason) => ({
    distanceKm:           round2(input.distanceKm),
    perKm:                input.deliveryPerKm,
    baseFee:              input.deliveryBaseFee,
    threshold:            input.freeShipThreshold,
    radiusKm:             input.radiusKm,
    freeDeliveryRadiusKm: input.freeDeliveryRadiusKm,
    feeMode:              mode,
    flatFee:              input.deliveryFlatFee,
    freeReason,
    provider,
  })

  const outOfZone = input.distanceKm > input.radiusKm
  if (outOfZone) {
    return { fee: 0, freeShipApplied: false, outOfZone: true, freeReason: null, breakdown: mkBreakdown(null) }
  }

  // Free theo giá trị đơn
  if (input.freeShipThreshold !== null && input.subtotal >= input.freeShipThreshold) {
    return { fee: 0, freeShipApplied: true, outOfZone: false, freeReason: 'subtotal', breakdown: mkBreakdown('subtotal') }
  }

  // Free theo khoảng cách (dưới bán kính free)
  if (input.freeDeliveryRadiusKm > 0 && input.distanceKm < input.freeDeliveryRadiusKm) {
    return { fee: 0, freeShipApplied: true, outOfZone: false, freeReason: 'distance', breakdown: mkBreakdown('distance') }
  }

  const fee = mode === 'flat'
    ? round2(input.deliveryFlatFee)
    : round2(input.deliveryBaseFee + input.distanceKm * input.deliveryPerKm)
  return { fee, freeShipApplied: false, outOfZone: false, freeReason: null, breakdown: mkBreakdown(null) }
}

/** Decimal helper — Prisma Decimal vào Number an toàn. */
export function dec(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : Number(v)
}
