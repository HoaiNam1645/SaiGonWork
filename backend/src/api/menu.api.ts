import type { Request, Response } from 'express'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/menu — trả toàn bộ menu đã denormalize theo cấu trúc dễ render:
 * categories[] với dishes[] nested, options[].values[] nested.
 *
 * Frontend chỉ cần 1 request thay vì N+1 (1 cho categories + N cho dishes).
 * Khá nặng (~100KB cho 34 dishes có image URL) nhưng chỉ gọi 1 lần khi mount.
 *
 * Có thể add Cache-Control headers sau khi menu ổn định.
 */
export async function getMenu(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      dishes: {
        where:   { isAvailable: true },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
            include: {
              values: {
                where:   { isActive: true },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  // Shape — phẳng & friendly cho JSON. Decimal → Number, BigInt → string.
  const payload = categories.map(c => ({
    id:           c.id.toString(),
    slug:         c.slug,
    nameVi:       c.nameVi,
    nameEn:       c.nameEn,
    description:  c.descriptionVi ?? null,
    imageUrl:     c.imageUrl ?? null,
    displayOrder: c.displayOrder,
    dishes: c.dishes.map(d => {
      const basePrice  = Number(d.price)
      const firstOpt   = d.options[0]  // hiện tại mỗi dish max 1 option
      const variants =
        firstOpt && firstOpt.values.length > 0
          ? firstOpt.values.map(v => ({
              valueId: v.id.toString(),
              label:   v.labelVi,
              labelEn: v.labelEn,
              // Full price (base + delta) — frontend không phải tính lại
              price:   basePrice + Number(v.priceDelta),
            }))
          : null

      return {
        id:            d.id.toString(),
        slug:          d.slug,
        nameVi:        d.nameVi,
        nameEn:        d.nameEn,
        descriptionVi: d.descriptionVi,
        descriptionEn: d.descriptionEn,
        price:         basePrice,
        currency:      d.currency,
        imageUrl:      d.imageUrl,
        isFeatured:    d.isFeatured,
        spicyLevel:    d.spicyLevel,
        prepTimeMin:   d.prepTimeMin,
        optionId:      firstOpt ? firstOpt.id.toString() : null,
        variants,
      }
    }),
  }))

  res.json({ categories: payload })
}
