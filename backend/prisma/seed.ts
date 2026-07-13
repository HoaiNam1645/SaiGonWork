/**
 * Database seed — idempotent, UPSERT pattern.
 *
 * Chạy:
 *   npx prisma db seed       (qua config "prisma.seed" trong package.json)
 *   npm run seed              (alias)
 *
 * Lệnh này CHỈ INSERT/UPDATE — KHÔNG xoá data. Gọi nhiều lần an toàn.
 *
 * Workflow chuẩn (dev + production):
 *   1. npx prisma migrate deploy   — apply migrations chưa run (forward-only)
 *   2. npx prisma db seed          — seed dữ liệu khởi tạo / cập nhật cấu hình
 *
 * Dev workflow khi sửa schema.prisma:
 *   1. Sửa prisma/schema.prisma
 *   2. npx prisma migrate dev --name <change_name>   — tạo migration mới + apply
 *   3. (Optional) npx prisma db seed                  — refresh seed nếu cần
 *
 * KHÔNG dùng `prisma migrate reset` hay `db push --force-reset` trong production.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
// Import route registry để populate definePermission() calls trước khi sync.
// CHÚ Ý: side-effect import — tất cả file route được load → registry đầy đủ.
import '../src/routes'
import { syncPermissionsFromRegistry } from '../src/lib/permissionSync'
import { MENU } from './menuData'

const prisma = new PrismaClient()

// =====================================================================
// Constants
// =====================================================================

// Default password cho admin + staff seed. Hash runtime bằng bcrypt cost 12 (khớp
// register handler). ĐỔI sau khi seed lần đầu trên production:
//   npm run set-password -- <email> <newPassword>
const SEED_PASSWORD = 'admin123'

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&auto=format&fit=crop&q=75`

// =====================================================================
// Users
// =====================================================================

async function seedUsers() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12)

  await prisma.user.upsert({
    where:  { email: 'admin@saigonwok.local' },
    update: {},  // tồn tại → giữ nguyên (đặc biệt: password đã đổi nếu user đổi)
    create: {
      email:           'admin@saigonwok.local',
      phone:           '+4971112345678',
      passwordHash,
      fullName:        'Super Admin',
      role:            'admin',
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.user.upsert({
    where:  { email: 'staff1@saigonwok.local' },
    update: {},
    create: {
      email:           'staff1@saigonwok.local',
      phone:           '+4971112345679',
      passwordHash,
      fullName:        'Nhân viên 1',
      role:            'staff',
      emailVerifiedAt: new Date(),
    },
  })
}

// =====================================================================
// Store settings (single row, id=1)
// =====================================================================

async function seedStoreSettings() {
  // Cửa hàng ăn tại chỗ Mo–So 11:00–21:30, GIAO HÀNG tới 23:00 (theo menu in 07/2026).
  // openHours gate đơn ONLINE → dùng khung giao hàng.
  const openHours = {
    mon: ['11:00', '23:00'],
    tue: ['11:00', '23:00'],
    wed: ['11:00', '23:00'],
    thu: ['11:00', '23:00'],
    fri: ['11:00', '23:00'],
    sat: ['11:00', '23:00'],
    sun: ['11:00', '23:00'],
  }
  await prisma.storeSettings.upsert({
    where:  { id: 1 },
    update: {},   // tồn tại → giữ admin's edits
    create: {
      id:                 1,
      name:               'Sài Gòn Wok',
      hotline:            '+4971112345678',
      email:              'contact@saigonwok.de',
      address:            'Kanalstraße 10, 70182 Stuttgart',
      lat:                48.7843,
      lng:                9.1928,
      openHoursJson:      openHours,
      paypalEmail:        'pay@saigonwok.de',
      paypalMeLink:       'https://paypal.me/saigonwok',
      bankQrImageUrl:     '/payment/bank-qr.png',
      bankAccountName:    'Sai Gon Wok GmbH',
      bankAccountNo:      'DE89 3704 0044 0532 0130 00',
      bankName:           'Sparkasse',
      deliveryRadiusKm:   15,
      deliveryBaseFee:    0,
      deliveryPerKm:      2,
      freeShipThreshold:  25,
      kitchenPrepMinutes: 25,
      routingProvider:    'osrm',
      defaultCurrency:    'EUR',
    },
  })
}

// =====================================================================
// Menu — categories + dishes + dish_options + dish_option_values
// =====================================================================

// Menu data tách ra prisma/menuData.ts — dùng chung với scripts/replaceMenu.ts.

async function seedMenu() {
  let catCount  = 0
  let dishCount = 0
  let optCount  = 0

  for (const cat of MENU) {
    // Category — upsert by slug
    const upCat = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { nameVi: cat.nameVi, nameEn: cat.nameEn, displayOrder: cat.displayOrder },
      create: {
        slug:         cat.slug,
        nameVi:       cat.nameVi,
        nameEn:       cat.nameEn,
        displayOrder: cat.displayOrder,
      },
    })
    catCount++

    for (let i = 0; i < cat.dishes.length; i++) {
      const d = cat.dishes[i]

      // Dish — upsert by slug
      const upDish = await prisma.dish.upsert({
        where:  { slug: d.slug },
        update: {
          categoryId:    upCat.id,
          nameVi:        d.nameVi,
          descriptionVi: d.descriptionVi,
          price:         d.price,
          imageUrl:      d.imageUrl,
          isFeatured:    d.isFeatured ?? false,
          displayOrder:  i + 1,
        },
        create: {
          categoryId:    upCat.id,
          slug:          d.slug,
          nameVi:        d.nameVi,
          descriptionVi: d.descriptionVi,
          price:         d.price,
          imageUrl:      d.imageUrl,
          isFeatured:    d.isFeatured ?? false,
          displayOrder:  i + 1,
        },
      })
      dishCount++

      // Dish options + values — không có unique key tự nhiên cho options nên
      // chiến lược "skip if exists" để idempotent + giữ admin's modifications.
      if (d.variants?.length) {
        const existing = await prisma.dishOption.count({ where: { dishId: upDish.id } })
        if (existing === 0) {
          const opt = await prisma.dishOption.create({
            data: {
              dishId:       upDish.id,
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
    }
  }

  return { catCount, dishCount, optCount }
}

// =====================================================================
// Roles + permissions (RBAC)
// =====================================================================

/**
 * 3 system role:
 *   - admin    → tất cả permission
 *   - staff    → STAFF_PERMISSIONS (curate dưới đây — orders + read các thứ khác)
 *   - customer → không có admin permission
 *
 * System role không xóa được (isSystem=true). Admin có thể tạo thêm custom roles
 * qua UI /admin/roles (Phase 3).
 *
 * Idempotent: chạy nhiều lần OK. Permission có sẵn ở DB nhưng không assign vẫn an toàn.
 */

const STAFF_PERMISSIONS = [
  // Orders — view + xử lý đơn (không sửa, không hủy admin-level)
  'orders.admin.list',
  'orders.admin.overdue',
  'orders.status.change',
  'orders.cancel',          // staff cancel bị giới hạn trong handler (state machine)
  // Customers — chỉ list/read (không update/deactivate)
  'customers.list',
  'customers.read',
  // Promotions — read-only
  'promotions.list',
  'promotions.read',
]

async function seedRolesAndPermissions() {
  // 1. Sync permissions từ code registry → DB
  const syncResult = await syncPermissionsFromRegistry()
  const synced = syncResult.added.length + syncResult.updated.length + syncResult.reactivated.length
  console.log(`  ✓ permissions synced — added=${syncResult.added.length} updated=${syncResult.updated.length} reactivated=${syncResult.reactivated.length} deprecated=${syncResult.deprecated.length}`)

  // 2. Upsert 3 system roles
  const adminRole = await prisma.appRole.upsert({
    where:  { key: 'admin' },
    update: { name: 'Administrator', description: 'Toàn quyền hệ thống', isSystem: true },
    create: { key: 'admin',    name: 'Administrator', description: 'Toàn quyền hệ thống', isSystem: true },
  })
  const staffRole = await prisma.appRole.upsert({
    where:  { key: 'staff' },
    update: { name: 'Staff', description: 'Nhân viên — xử lý đơn hàng', isSystem: true },
    create: { key: 'staff',    name: 'Staff', description: 'Nhân viên — xử lý đơn hàng', isSystem: true },
  })
  const customerRole = await prisma.appRole.upsert({
    where:  { key: 'customer' },
    update: { name: 'Customer', description: 'Khách hàng', isSystem: true },
    create: { key: 'customer', name: 'Customer', description: 'Khách hàng', isSystem: true },
  })

  // 3. Admin role → tất cả permissions (loại bỏ deprecated)
  const allPerms = await prisma.permission.findMany({
    where:  { isDeprecated: false },
    select: { id: true, key: true },
  })

  await assignPermissionsToRole(adminRole.id, allPerms.map(p => p.id))
  console.log(`  ✓ role:admin → ${allPerms.length} permissions`)

  // 4. Staff role → STAFF_PERMISSIONS (lookup id từ key)
  const staffPermIds = allPerms.filter(p => STAFF_PERMISSIONS.includes(p.key)).map(p => p.id)
  await assignPermissionsToRole(staffRole.id, staffPermIds)
  console.log(`  ✓ role:staff → ${staffPermIds.length} permissions`)

  // 5. Customer role → 0 permissions
  await assignPermissionsToRole(customerRole.id, [])
  console.log(`  ✓ role:customer → 0 permissions`)

  // 6. Auto-assign role theo users.role enum cho user đã tồn tại
  //    (chỉ insert nếu chưa có — không xóa role assignment do admin đã add tay)
  const allUsers = await prisma.user.findMany({ select: { id: true, role: true } })
  for (const u of allUsers) {
    const targetRoleId =
      u.role === 'admin'    ? adminRole.id    :
      u.role === 'staff'    ? staffRole.id    :
                              customerRole.id
    await prisma.userRole.upsert({
      where:  { userId_roleId: { userId: u.id, roleId: targetRoleId } },
      update: {},
      create: { userId: u.id, roleId: targetRoleId },
    })
  }
  console.log(`  ✓ user_roles — assigned theo enum cho ${allUsers.length} users`)

  if (synced > 0) {
    console.log(`     (${syncResult.added.length} new permission keys vừa được tự động assign cho admin)`)
  }
}

/** Replace toàn bộ permissions của 1 role bằng danh sách mới — idempotent. */
async function assignPermissionsToRole(roleId: bigint, permissionIds: bigint[]) {
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } })
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map(pid => ({ roleId, permissionId: pid })),
      })
    }
  })
}

// =====================================================================
// Main
// =====================================================================

async function main() {
  console.log('🌱  Seeding database (idempotent)…\n')

  await seedUsers()
  console.log('  ✓ users')

  await seedStoreSettings()
  console.log('  ✓ store_settings')

  const { catCount, dishCount, optCount } = await seedMenu()
  console.log(`  ✓ menu — ${catCount} categories, ${dishCount} dishes, ${optCount} new options`)

  await seedRolesAndPermissions()

  console.log('\n✓ Seed done.')
}

main()
  .catch(e => {
    console.error('\n[seed failed]', e)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())
