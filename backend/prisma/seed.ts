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
  const openHours = {
    mon: ['11:00', '22:00'],
    tue: ['11:00', '22:00'],
    wed: ['11:00', '22:00'],
    thu: ['11:00', '22:00'],
    fri: ['11:00', '23:00'],
    sat: ['12:00', '23:00'],
    sun: ['12:00', '22:00'],
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

interface DishSeed {
  slug:          string
  nameVi:        string
  descriptionVi: string | null
  price:         number
  imageUrl:      string
  isFeatured?:   boolean
  variants?:     Array<{ label: string; labelEn: string; priceDelta: number }>
}

interface CategorySeed {
  slug:         string
  nameVi:       string
  nameEn:       string
  displayOrder: number
  dishes:       DishSeed[]
}

const VAR3 = [
  { label: 'Tofu',            labelEn: 'Tofu',    priceDelta: 0 },
  { label: 'Hähnchenfleisch', labelEn: 'Chicken', priceDelta: 0 },
  { label: 'Garnelen',        labelEn: 'Shrimp',  priceDelta: 0 },
]
const VAR_PHO = [
  { label: 'Tofu',            labelEn: 'Tofu',    priceDelta: 0 },
  { label: 'Hähnchenfleisch', labelEn: 'Chicken', priceDelta: 1 },
  { label: 'Rindfleisch',     labelEn: 'Beef',    priceDelta: 2 },
]
const VAR_WOK = [
  { label: 'Tofu',                    labelEn: 'Tofu',          priceDelta: 0 },
  { label: 'Hähnchen',                labelEn: 'Chicken',       priceDelta: 0 },
  { label: 'Frittiertes Hähnchen',    labelEn: 'Fried chicken', priceDelta: 0 },
  { label: 'Knusprig gebratene Ente', labelEn: 'Crispy duck',   priceDelta: 2 },
  { label: 'Gebratenes Rindfleisch',  labelEn: 'Roasted beef',  priceDelta: 2 },
]
const VAR_RICE_NOODLE = [
  { label: 'Tofu',                 labelEn: 'Tofu',            priceDelta: 0 },
  { label: 'Gemüse',               labelEn: 'Vegetables',      priceDelta: 0 },
  { label: 'Hähnchen',             labelEn: 'Chicken',         priceDelta: 2 },
  { label: 'Panierte Hühnerbrust', labelEn: 'Breaded chicken', priceDelta: 2 },
  { label: 'Knusprig Ente',        labelEn: 'Crispy duck',     priceDelta: 4 },
  { label: 'Rindfleisch',          labelEn: 'Beef',            priceDelta: 4 },
]
const VAR_BIBIMBAP = [
  { label: 'Tofu',        labelEn: 'Tofu',    priceDelta: 0 },
  { label: 'Hähnchen',    labelEn: 'Chicken', priceDelta: 0 },
  { label: 'Rindfleisch', labelEn: 'Beef',    priceDelta: 2 },
  { label: 'Garnelen',    labelEn: 'Shrimp',  priceDelta: 2 },
]

const MENU: CategorySeed[] = [
  {
    slug: 'vorspeisen', nameVi: 'Vorspeisen', nameEn: 'Starters', displayOrder: 1,
    dishes: [
      { slug: 'wantan',             nameVi: 'Knusprig gebackene Wan-Tan', descriptionVi: '5 Stk. — Gefüllte Teigtaschen mit süß-sauer Sauce', price: 4.50, imageUrl: IMG('photo-1496116218417-1a781b1c416c'), isFeatured: true },
      { slug: 'gyoza',              nameVi: 'Gyoza',                      descriptionVi: '5 Stk. — Frittierte Teigtaschen mit Hähnchenfleisch und Gemüsefüllung, mit süß-saurem Dip', price: 4.50, imageUrl: IMG('photo-1625938144755-652e08e359b7') },
      { slug: 'gyoza-veggie',       nameVi: 'Gyoza Veggie',               descriptionVi: '5 Stk. — Vegetarische Gyoza mit Gemüsefüllung', price: 4.50, imageUrl: IMG('photo-1625938144755-652e08e359b7') },
      { slug: 'mini-rollen',        nameVi: 'Mini-Rollen',                descriptionVi: '7 Stk. — Tofu, Karotten, Sojasprossen, Reisnudeln (vegetarisch)', price: 4.50, imageUrl: IMG('photo-1576577445504-6af96477db52') },
      { slug: 'nem-chay',           nameVi: 'Nem Chay',                   descriptionVi: '3 Stk. — Hausgemachte vietnamesische Frühlingsrollen, vegane Füllung mit Glasnudeln, Pilzen, Karotten — süß-sauer Dip', price: 4.50, imageUrl: IMG('photo-1606471191009-63994c53433b') },
      { slug: 'edamame',            nameVi: 'Edamame',                    descriptionVi: 'Grüne Bohnen mit Meersalz', price: 4.50, imageUrl: IMG('photo-1599056504888-fc8d72bf6ec0') },
      { slug: 'pommes',             nameVi: 'Pommes Frites',              descriptionVi: 'Knusprige Pommes Frites', price: 4.50, imageUrl: IMG('photo-1573080496219-bb080dd4f877') },
      { slug: 'yakitori',           nameVi: 'Yakitori',                   descriptionVi: '2 Stk. — Hähnchen Yakitori, Teriyaki mit Tamarinden Soße', price: 4.50, imageUrl: IMG('photo-1535473895227-bdecb20fb157'), isFeatured: true },
      { slug: 'sommerrollen',       nameVi: 'Sommerrollen mit Salat',     descriptionVi: 'Reisnudeln, geröstete Schalotten, Gurke, Reispapier mit süß-sauer Soße', price: 4.50, imageUrl: IMG('photo-1576577445504-6af96477db52'), variants: VAR3 },
      { slug: 'gebratene-garnelen', nameVi: 'Gebratene Garnelen',         descriptionVi: '2 Stk. — Grüne Reisflöckchen, Garnelen, süß-sauer Soße', price: 6.50, imageUrl: IMG('photo-1559847844-5315695dadae'), isFeatured: true },
      { slug: 'vorspeise-platte',   nameVi: 'Gemischte Vorspeise-Platte', descriptionVi: '2 Sommerrollen · 2 Nem Chay · 2 Gebratene Garnelen · 5 Gyoza · 4 Wan-Tan', price: 15.90, imageUrl: IMG('photo-1547928576-b822bc410bdf'), isFeatured: true },
    ],
  },
  {
    slug: 'suppen', nameVi: 'Suppen', nameEn: 'Soups', displayOrder: 2,
    dishes: [
      { slug: 'peking-suppe', nameVi: 'Peking-Suppe',  descriptionVi: 'Sauer-scharf', price: 4.90, imageUrl: IMG('photo-1547592180-85f173990554'), isFeatured: true },
      { slug: 'wantan-suppe', nameVi: 'Wantan Suppe',  descriptionVi: '4 Stk. — Hähnchenfleisch, Garnelen, Zucchini, Brokkoli', price: 4.90, imageUrl: IMG('photo-1569718212165-3a8278d5f624') },
      { slug: 'tom-yum',      nameVi: 'Tom Yum Suppe', descriptionVi: 'Tomyum, Zucchini, Brokkoli, Karotten, Champignon', price: 4.90, imageUrl: IMG('photo-1569059078571-d0a1bd0d6c1e'), isFeatured: true, variants: VAR3 },
    ],
  },
  {
    slug: 'salate', nameVi: 'Salate', nameEn: 'Salads', displayOrder: 3,
    dishes: [
      { slug: 'gemischter-salat', nameVi: 'Gemischter Salat',      descriptionVi: null, price: 6.50, imageUrl: IMG('photo-1546069901-ba9599a7e63c') },
      { slug: 'tomatensalat',     nameVi: 'Tomatensalat',          descriptionVi: null, price: 6.50, imageUrl: IMG('photo-1607532941433-304659e8198a') },
      { slug: 'haehnchen-salat',  nameVi: 'Hähnchenfleisch-Salat', descriptionVi: null, price: 7.50, imageUrl: IMG('photo-1551248429-40975aa4de74') },
      { slug: 'garnelen-salat',   nameVi: 'Garnelen-Salat',        descriptionVi: null, price: 7.50, imageUrl: IMG('photo-1505253716362-afaea1d3d1af'), isFeatured: true },
    ],
  },
  {
    slug: 'hauptgerichte', nameVi: 'Hauptgerichte', nameEn: 'Main dishes', displayOrder: 4,
    dishes: [
      { slug: 'pho',           nameVi: 'Pho',           descriptionVi: 'Traditionelle 5-Kräuter-Brühe, Reisbandnudel-Suppe mit frischem Koriander, Frühlingszwiebeln und Sojasprossen', price: 12.00, imageUrl: IMG('photo-1582878826629-29b7ad1cdc43'), isFeatured: true,  variants: VAR_PHO },
      { slug: 'pho-xao',       nameVi: 'Pho Xao',       descriptionVi: 'Gebratene Reisbandnudeln mit Gemüse', price: 12.00, imageUrl: IMG('photo-1612929633738-8fe44f7ec841'), variants: VAR_PHO },
      { slug: 'bun-bo-nam-bo', nameVi: 'Bun Bo Nam Bo', descriptionVi: 'Reisnudeln, Salat, hausgemachte Soße, geröstete Schalotten, Erdnüsse, Gurke, Koriander, Sojasprossen, Rindfleisch', price: 14.00, imageUrl: IMG('photo-1576577445504-6af96477db52'), isFeatured: true },
      { slug: 'bun-vegan',     nameVi: 'Bun Vegan',     descriptionVi: 'Vegane Frühlingsrollen auf warmen Reisnudeln mit Wildkräuter-Salat, Koriander, gerösteten Zwiebeln, Erdnüssen, Sojasoße', price: 13.00, imageUrl: IMG('photo-1565299585323-38d6b0865b47') },
      { slug: 'bun-tofu',      nameVi: 'Bun Tofu',      descriptionVi: 'Im Wok gebratener Bio-Tofu auf warmen Reisnudeln mit Sojasprossen, Karotten, Wildkräuter-Salat, Koriander, Erdnüssen, Sojasoße', price: 13.00, imageUrl: IMG('photo-1559314809-0d155014e29e') },
    ],
  },
  {
    slug: 'wok-gerichte', nameVi: 'Wok-Gerichte', nameEn: 'Wok dishes', displayOrder: 5,
    dishes: [
      { slug: 'thai-curry',   nameVi: 'Thai Curry',                descriptionVi: 'Gemüse, Chili, Salat, Zitronengras — zu Reis', price: 10.90, imageUrl: IMG('photo-1455619452474-d2be8b1e70cd'), isFeatured: true, variants: VAR_WOK },
      { slug: 'kung-pao',     nameVi: 'Kung Pao Soße',             descriptionVi: 'Grüne Gemüse, Reis', price: 10.90, imageUrl: IMG('photo-1582878826629-29b7ad1cdc43'), variants: VAR_WOK },
      { slug: 'suess-sauer',  nameVi: 'Süß-sauer Soße mit Ananas', descriptionVi: 'Grüne Gemüse, Reis', price: 10.90, imageUrl: IMG('photo-1604908176997-125f25cc6f3d'), variants: VAR_WOK },
      { slug: 'saigon-sosse', nameVi: 'Saigon Soße',               descriptionVi: 'Grüne Gemüse, Reis', price: 10.90, imageUrl: IMG('photo-1633237308525-cd587cf71926'), variants: VAR_WOK },
    ],
  },
  {
    slug: 'reis-nudeln', nameVi: 'Reis & Nudeln', nameEn: 'Rice & Noodles', displayOrder: 6,
    dishes: [
      { slug: 'gebratene-eier-reis', nameVi: 'Gebratene Eier-Reis Gerichte', descriptionVi: 'Gebratener Reis mit Ei, Sojasprossen und Zwiebeln', price: 8.90,  imageUrl: IMG('photo-1603133872878-684f208fb84b'), variants: VAR_RICE_NOODLE },
      { slug: 'gebratene-nudeln',    nameVi: 'Gebratene Nudelgerichte',      descriptionVi: 'Gebratene Nudeln mit Ei, Sojasprossen und Zwiebeln', price: 8.90,  imageUrl: IMG('photo-1612929633738-8fe44f7ec841'), isFeatured: true, variants: VAR_RICE_NOODLE },
      { slug: 'yaki-udon',           nameVi: 'Yaki Udon',                    descriptionVi: 'Mit Gemüse, Karotten, Sojasprossen, Frühlingszwiebeln, Paprika', price: 11.00, imageUrl: IMG('photo-1569058242253-92a9c755a0ec'), variants: VAR_RICE_NOODLE },
      { slug: 'bibimbap',            nameVi: 'Bibimbap',                     descriptionVi: 'Reis, Karotten, Gurken, Zucchini, Sojasprossen, Mais, Erbsen, Sesam, Wakame, Ei', price: 11.90, imageUrl: IMG('photo-1553163147-622ab57be1c7'), isFeatured: true, variants: VAR_BIBIMBAP },
    ],
  },
  {
    slug: 'kinder', nameVi: 'Kinder Menu', nameEn: 'Kids menu', displayOrder: 7,
    dishes: [
      { slug: 'kinder-huehnchen', nameVi: 'Panierte Hühnerbrustfilet', descriptionVi: null, price: 6.90, imageUrl: IMG('photo-1532550907401-a500c9a57435') },
      { slug: 'kinder-reis',      nameVi: 'Gebratene Duftreis',        descriptionVi: null, price: 6.90, imageUrl: IMG('photo-1603133872878-684f208fb84b') },
    ],
  },
  {
    slug: 'desserts', nameVi: 'Desserts', nameEn: 'Desserts', displayOrder: 8,
    dishes: [
      { slug: 'chuoi-chien', nameVi: 'Chuối Chiên', descriptionVi: 'Gebackene Banane mit Honig und Schokoladensoße', price: 4.50, imageUrl: IMG('photo-1601493700631-2b16ec4b4716'), isFeatured: true },
    ],
  },
]

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
