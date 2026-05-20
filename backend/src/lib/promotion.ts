import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, NotFound } from '@/lib/errors'
import { round2 } from '@/lib/pricing'

export type PromotionType = 'percent' | 'fixed' | 'free_ship'

export interface PromotionApplyResult {
  promotionId:   bigint
  code:          string
  type:          PromotionType
  /** Discount áp lên subtotal (KHÔNG bao gồm phần free_ship). */
  discount:      number
  /** Phí ship sau khi áp promo (= 0 nếu free_ship). null = không thay đổi. */
  shippingAfter: number | null
}

interface ApplyInput {
  code:        string
  userId:      bigint | null
  subtotal:    number
  deliveryFee: number
}

/**
 * Validate code + tính discount. Throw HttpError với i18n key nếu fail.
 * KHÔNG mutate DB (chỉ ++usedCount khi order create xong, gọi từ transaction).
 */
export async function applyPromotion(input: ApplyInput): Promise<PromotionApplyResult> {
  const codeNorm = input.code.trim().toUpperCase()
  // Không leak info: cùng response cho "code sai", "code tắt", "code hết hạn", "code chưa
  // tới ngày" — attacker không phân biệt được, chống enumerate code list của shop.
  if (!codeNorm) throw BadRequest('promo.expired', 'PROMO_EXPIRED')

  const promo = await prisma.promotion.findUnique({ where: { code: codeNorm } })
  if (!promo)           throw BadRequest('promo.expired', 'PROMO_EXPIRED')
  if (!promo.isActive)  throw BadRequest('promo.expired', 'PROMO_EXPIRED')

  const now = new Date()
  if (promo.startsAt && now < promo.startsAt) throw BadRequest('promo.expired', 'PROMO_EXPIRED')
  if (promo.endsAt   && now > promo.endsAt)   throw BadRequest('promo.expired', 'PROMO_EXPIRED')

  const minOrder = Number(promo.minOrder)
  if (input.subtotal < minOrder) {
    throw BadRequest('promo.min_order', 'PROMO_MIN_ORDER', { amount: minOrder })
  }

  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw BadRequest('promo.usage_limit', 'PROMO_USAGE_LIMIT')
  }

  if (promo.perUserLimit != null && input.userId) {
    const used = await prisma.order.count({
      where: { userId: input.userId, promotionId: promo.id },
    })
    if (used >= promo.perUserLimit) {
      throw BadRequest('promo.per_user_limit', 'PROMO_PER_USER_LIMIT')
    }
  }

  const value       = Number(promo.value)
  const maxDiscount = promo.maxDiscount != null ? Number(promo.maxDiscount) : null
  let discount      = 0
  let shippingAfter: number | null = null

  switch (promo.type as PromotionType) {
    case 'percent': {
      discount = round2(input.subtotal * value / 100)
      if (maxDiscount != null && discount > maxDiscount) discount = maxDiscount
      break
    }
    case 'fixed': {
      discount = Math.min(value, input.subtotal)
      break
    }
    case 'free_ship': {
      shippingAfter = 0
      break
    }
  }

  return {
    promotionId:   promo.id,
    code:          promo.code,
    type:          promo.type as PromotionType,
    discount:      round2(discount),
    shippingAfter,
  }
}

/** Increment usedCount khi đơn được tạo thành công. Gọi trong cùng transaction. */
export async function incrementUsage(tx: Prisma.TransactionClient, promotionId: bigint) {
  await tx.promotion.update({
    where: { id: promotionId },
    data:  { usedCount: { increment: 1 } },
  })
}
