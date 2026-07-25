/**
 * Sync menu ĐANG SỐNG theo prisma/menuData.ts — cập nhật IN-PLACE theo slug.
 *
 * Dùng khi chỉ đổi giá / tên / mô tả / ảnh / nhãn variant (menu structure giữ nguyên):
 *   npx tsx scripts/syncMenu.ts
 *
 * Khác với replaceMenu.ts (thay cả menu, legacy-hoá món cũ, đổi dish id):
 * script này giữ nguyên id/slug — giỏ hàng đang mở không bị mất, không tạo rác legacy.
 * Variant values match theo displayOrder (thứ tự trong menuData). Nếu SỐ LƯỢNG
 * variant đổi hoặc slug không tồn tại → cảnh báo, bỏ qua (khi đó dùng replaceMenu).
 */

import { PrismaClient } from '@prisma/client'
import { MENU } from '../prisma/menuData'

const prisma = new PrismaClient()

async function main() {
  console.log('=== syncMenu — cập nhật in-place theo prisma/menuData.ts ===')
  let updated = 0
  let varUpdated = 0
  const warnings: string[] = []

  for (const cat of MENU) {
    const dbCat = await prisma.category.findUnique({ where: { slug: cat.slug } })
    if (!dbCat) { warnings.push(`category "${cat.slug}" không có trong DB — bỏ qua (dùng replaceMenu?)`); continue }
    await prisma.category.update({
      where: { id: dbCat.id },
      data:  { nameVi: cat.nameVi, nameEn: cat.nameEn, displayOrder: cat.displayOrder },
    })

    for (let i = 0; i < cat.dishes.length; i++) {
      const d = cat.dishes[i]
      const dbDish = await prisma.dish.findUnique({
        where:   { slug: d.slug },
        include: { options: { include: { values: { orderBy: { displayOrder: 'asc' } } } } },
      })
      if (!dbDish) { warnings.push(`dish "${d.slug}" không có trong DB — bỏ qua`); continue }

      await prisma.dish.update({
        where: { id: dbDish.id },
        data: {
          categoryId:    dbCat.id,
          nameVi:        d.nameVi,
          descriptionVi: d.descriptionVi,
          price:         d.price,
          imageUrl:      d.imageUrl,
          isFeatured:    d.isFeatured ?? false,
          displayOrder:  i + 1,
        },
      })
      updated++

      // Variants: match theo displayOrder trong option đầu tiên
      if (d.variants?.length) {
        const opt = dbDish.options[0]
        if (!opt || opt.values.length !== d.variants.length) {
          warnings.push(`dish "${d.slug}": số variant DB (${opt?.values.length ?? 0}) ≠ menuData (${d.variants.length}) — bỏ qua variants`)
          continue
        }
        for (let j = 0; j < d.variants.length; j++) {
          const v = d.variants[j]
          await prisma.dishOptionValue.update({
            where: { id: opt.values[j].id },
            data:  { labelVi: v.label, labelEn: v.labelEn, priceDelta: v.priceDelta },
          })
          varUpdated++
        }
      }
    }
  }

  console.log(`✓ dishes updated: ${updated} | variant values updated: ${varUpdated}`)
  for (const w of warnings) console.warn(`⚠ ${w}`)
  console.log('=== DONE ===')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
