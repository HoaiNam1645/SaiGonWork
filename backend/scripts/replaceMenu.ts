/**
 * Thay TOÀN BỘ menu đang sống bằng data mới từ prisma/menuData.ts.
 *
 * Chạy: npx tsx scripts/replaceMenu.ts
 *
 * An toàn dữ liệu:
 *  - KHÔNG xoá dish/category cũ (OrderItem→Dish là Restrict — đơn cũ giữ nguyên
 *    lịch sử + FK). Thay vào đó: is_active=false + đổi slug thành "legacy-<id>-…"
 *    để nhường slug cho menu mới. Menu API chỉ trả is_active=true → menu cũ biến mất.
 *  - Cart items bị XOÁ (giỏ hàng là dữ liệu tạm — món cũ không đặt được nữa).
 *  - Orders/users/settings không đụng tới.
 *
 * Idempotent: chạy lại lần nữa sẽ legacy-hoá menu vừa chèn rồi chèn lại từ data.
 */

import { PrismaClient } from '@prisma/client'
import { MENU } from '../prisma/menuData'

const prisma = new PrismaClient()

function legacySlug(prefix: string, id: bigint, slug: string, max: number): string {
  // Bảo toàn unique + vừa cột: legacy-<id>-<slug cũ> cắt theo max length.
  return `${prefix}-${id}-${slug}`.slice(0, max)
}

async function main() {
  console.log('=== replaceMenu — thay menu theo prisma/menuData.ts ===')

  // 0) Dọn giỏ hàng (món cũ sắp bị ẩn — giỏ cũ vô nghĩa)
  const carts = await prisma.cartItem.deleteMany({})
  console.log(`✓ cart_items cleared: ${carts.count}`)

  // 1) Legacy-hoá dishes đang active (đổi slug + deactivate)
  const activeDishes = await prisma.dish.findMany({
    where: { NOT: { slug: { startsWith: 'legacy-' } } },
    select: { id: true, slug: true },
  })
  for (const d of activeDishes) {
    await prisma.dish.update({
      where: { id: d.id },
      data: {
        slug:        legacySlug('legacy', d.id, d.slug, 150),
        isAvailable: false,
        isFeatured:  false,
      },
    })
  }
  console.log(`✓ dishes legacy-hoá: ${activeDishes.length}`)

  // 2) Legacy-hoá categories
  const activeCats = await prisma.category.findMany({
    where: { NOT: { slug: { startsWith: 'legacy-' } } },
    select: { id: true, slug: true },
  })
  for (const c of activeCats) {
    await prisma.category.update({
      where: { id: c.id },
      data: {
        slug:     legacySlug('legacy', c.id, c.slug, 100),
        isActive: false,
      },
    })
  }
  console.log(`✓ categories legacy-hoá: ${activeCats.length}`)

  // 3) Chèn menu mới (create thuần — slug đã được giải phóng ở bước 1-2)
  let dishCount = 0
  let optCount  = 0
  for (const cat of MENU) {
    const newCat = await prisma.category.create({
      data: {
        slug:         cat.slug,
        nameVi:       cat.nameVi,
        nameEn:       cat.nameEn,
        displayOrder: cat.displayOrder,
        isActive:     true,
      },
    })

    for (let i = 0; i < cat.dishes.length; i++) {
      const d = cat.dishes[i]
      const newDish = await prisma.dish.create({
        data: {
          categoryId:    newCat.id,
          slug:          d.slug,
          nameVi:        d.nameVi,
          descriptionVi: d.descriptionVi,
          price:         d.price,
          imageUrl:      d.imageUrl,
          isFeatured:    d.isFeatured ?? false,
          isAvailable:   true,
          displayOrder:  i + 1,
        },
      })
      dishCount++

      if (d.variants?.length) {
        const opt = await prisma.dishOption.create({
          data: {
            dishId:       newDish.id,
            nameVi:       'Auswahl',
            nameEn:       'Selection',
            type:         'single',
            isRequired:   true,
            displayOrder: 1,
          },
        })
        optCount++
        for (let j = 0; j < d.variants.length; j++) {
          const v = d.variants[j]
          await prisma.dishOptionValue.create({
            data: {
              dishOptionId: opt.id,
              labelVi:      v.label,
              labelEn:      v.labelEn,
              priceDelta:   v.priceDelta,
              displayOrder: j + 1,
            },
          })
        }
      }
    }
    console.log(`  ✓ ${cat.slug}: ${cat.dishes.length} dishes`)
  }

  console.log(`✓ Menu mới: ${MENU.length} categories, ${dishCount} dishes, ${optCount} options`)
  console.log('=== DONE ===')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
