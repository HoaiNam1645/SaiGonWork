import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, Forbidden, NotFound } from '@/lib/errors'
import { signGuestToken } from '@/lib/jwt'
import { routeDriving } from '@/lib/osrm'
import { geocodeAddress } from '@/lib/geocode'
import { computeDeliveryFee, computeSubtotal, dec, round2 } from '@/lib/pricing'
import { emitOrderCreated, emitOrderStatusChanged } from '@/lib/socket'
import { createNotification } from '@/lib/notifications'

// =====================================================================
// Schemas
// =====================================================================

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })

const optionPairSchema = z.object({
  option_id: z.union([z.string(), z.number()]).transform(v => BigInt(v as string)),
  value_id:  z.union([z.string(), z.number()]).transform(v => BigInt(v as string)),
})

const itemSchema = z.object({
  dish_id:  z.union([z.string(), z.number()]).transform(v => BigInt(v as string)),
  quantity: z.number().int().min(1).max(99),
  options:  z.array(optionPairSchema).optional().default([]),
  note:     z.string().max(255).optional(),
})

const addressInlineSchema = z.object({
  recipient:   z.string().trim().min(2).max(100),
  phone:       phoneSchema,
  line:        z.string().trim().min(5).max(255),
  city:        z.string().trim().min(1).max(100),
  country:     z.string().length(2).default('DE'),
  ward:        z.string().max(100).optional().nullable(),
  district:    z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  lat:         z.number().min(-90).max(90).optional().nullable(),
  lng:         z.number().min(-180).max(180).optional().nullable(),
  note:        z.string().max(255).optional().nullable(),
})

const createOrderSchema = z.object({
  contact_name:   z.string().trim().min(2).max(100),
  contact_email:  z.string().email().toLowerCase(),
  contact_phone:  phoneSchema,
  address_id:     z.union([z.string(), z.number()]).transform(v => BigInt(v as string)).optional(),
  address:        addressInlineSchema.optional(),
  items:          z.array(itemSchema).min(1),
  payment_method: z.enum(['cash_on_delivery', 'paypal', 'bank_qr_image']),
  customer_note:  z.string().max(500).optional(),
  scheduled_at:   z.string().datetime().optional(),
})

// =====================================================================
// Helpers
// =====================================================================

interface ResolvedAddress {
  recipient:  string
  phone:      string
  line:       string
  ward:       string | null
  district:   string | null
  city:       string
  country:    string
  postalCode: string | null
  lat:        number | null
  lng:        number | null
  note:       string | null
}

/** Trả về snapshot địa chỉ (đã geocode nếu cần). */
async function resolveAddress(
  userId: bigint | null,
  body: z.infer<typeof createOrderSchema>,
): Promise<ResolvedAddress> {
  let base: ResolvedAddress | null = null

  if (body.address_id !== undefined) {
    if (!userId) throw BadRequest('order.address_id_requires_login', 'ADDRESS_ID_REQUIRES_LOGIN')
    const a = await prisma.address.findUnique({ where: { id: body.address_id } })
    if (!a || a.userId !== userId) throw NotFound('address.not_found')
    base = {
      recipient:  a.recipient,
      phone:      a.phone,
      line:       a.line,
      ward:       a.ward,
      district:   a.district,
      city:       a.city,
      country:    a.country,
      postalCode: a.postalCode,
      lat:        a.lat != null ? Number(a.lat) : null,
      lng:        a.lng != null ? Number(a.lng) : null,
      note:       a.note,
    }
  } else if (body.address) {
    base = {
      recipient:  body.address.recipient,
      phone:      body.address.phone,
      line:       body.address.line,
      ward:       body.address.ward  ?? null,
      district:   body.address.district ?? null,
      city:       body.address.city,
      country:    body.address.country,
      postalCode: body.address.postal_code ?? null,
      lat:        body.address.lat ?? null,
      lng:        body.address.lng ?? null,
      note:       body.address.note ?? null,
    }
  } else {
    throw BadRequest('order.address_required', 'ADDRESS_REQUIRED')
  }

  if (base.lat == null || base.lng == null) {
    const query = [base.line, base.postalCode, base.city, base.country].filter(Boolean).join(', ')
    const geo = await geocodeAddress(query)
    if (!geo) throw BadRequest('order.geocode_failed', 'GEOCODE_FAILED')
    base.lat = geo.lat
    base.lng = geo.lng
  }
  return base
}

interface PricedItem {
  dishId:       bigint
  dishName:     string
  dishImageUrl: string | null
  unitPrice:    number
  quantity:     number
  optionsJson:  Array<{ option_id: string; value_id: string; label: string; price_delta: number }>
  lineTotal:    number
  note:         string | null
}

async function validateAndPriceItems(
  items: z.infer<typeof itemSchema>[],
): Promise<PricedItem[]> {
  const dishIds = [...new Set(items.map(i => i.dish_id.toString()))]
  const dishes = await prisma.dish.findMany({
    where:   { id: { in: dishIds.map(s => BigInt(s)) } },
    include: { options: { include: { values: { where: { isActive: true } } } } },
  })
  const byId = new Map(dishes.map(d => [d.id.toString(), d]))

  const priced: PricedItem[] = []
  for (const it of items) {
    const dish = byId.get(it.dish_id.toString())
    if (!dish)             throw BadRequest('order.dish_not_found',   'DISH_NOT_FOUND')
    if (!dish.isAvailable) throw BadRequest('order.dish_unavailable', 'DISH_UNAVAILABLE')

    const optsById  = new Map(dish.options.map(o => [o.id.toString(), o]))
    let   priceDelta = 0
    const seenOptCount = new Map<string, number>()
    const optionsSnap: PricedItem['optionsJson'] = []

    for (const p of it.options) {
      const optKey = p.option_id.toString()
      const opt = optsById.get(optKey)
      if (!opt) throw BadRequest('order.invalid_option', 'INVALID_OPTION')
      const val = opt.values.find(v => v.id === p.value_id)
      if (!val) throw BadRequest('order.invalid_option_value', 'INVALID_OPTION_VALUE')

      const n = (seenOptCount.get(optKey) ?? 0) + 1
      seenOptCount.set(optKey, n)
      if (opt.type === 'single' && n > 1) {
        throw BadRequest('order.single_option_multi_values', 'SINGLE_MULTI_VALUE')
      }
      priceDelta += Number(val.priceDelta)
      optionsSnap.push({
        option_id:   opt.id.toString(),
        value_id:    val.id.toString(),
        label:       `${opt.nameVi}: ${val.labelVi}`,
        price_delta: Number(val.priceDelta),
      })
    }

    for (const opt of dish.options) {
      if (opt.isRequired && !seenOptCount.has(opt.id.toString())) {
        throw BadRequest('order.required_option_missing', 'REQUIRED_OPTION_MISSING')
      }
    }

    const unitPrice = round2(Number(dish.price) + priceDelta)
    priced.push({
      dishId:       dish.id,
      dishName:     dish.nameVi,
      dishImageUrl: dish.imageUrl,
      unitPrice,
      quantity:     it.quantity,
      optionsJson:  optionsSnap,
      lineTotal:    round2(unitPrice * it.quantity),
      note:         it.note ?? null,
    })
  }
  return priced
}

function generateCode(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `SGW-${year}-${rand}`
}

function shapePaymentInstructions(
  method: 'cash_on_delivery' | 'paypal' | 'bank_qr_image',
  amount: number,
  reference: string,
  store: Awaited<ReturnType<typeof prisma.storeSettings.findUnique>>,
) {
  if (!store) return null
  switch (method) {
    case 'bank_qr_image':
      return {
        method,
        amount,
        reference,
        bankQrImageUrl:  store.bankQrImageUrl,
        bankAccountName: store.bankAccountName,
        bankAccountNo:   store.bankAccountNo,
        bankName:        store.bankName,
      }
    case 'paypal':
      return {
        method,
        amount,
        reference,
        paypalEmail:  store.paypalEmail,
        paypalMeLink: store.paypalMeLink,
      }
    case 'cash_on_delivery':
      return { method, amount, reference }
  }
}

interface OrderRow {
  id:                     bigint
  code:                   string
  userId:                 bigint | null
  contactName:            string
  contactEmail:           string
  contactPhone:           string
  addressSnapshot:        Prisma.JsonValue
  subtotal:               Prisma.Decimal
  deliveryFee:            Prisma.Decimal
  distanceKm:             Prisma.Decimal | null
  durationMinutes:        number | null
  deliveryFeeBreakdown:   Prisma.JsonValue | null
  discount:               Prisma.Decimal
  total:                  Prisma.Decimal
  currency:               string
  status:                 string
  paymentMethod:          string
  customerNote:           string | null
  scheduledAt:            Date | null
  estimatedReadyAt:       Date | null
  createdAt:              Date
  updatedAt:              Date
}

function shapeOrder(o: OrderRow, items?: Array<{
  id: bigint; dishId: bigint; dishName: string; dishImageUrl: string | null;
  unitPrice: Prisma.Decimal; quantity: number; optionsJson: Prisma.JsonValue | null;
  lineTotal: Prisma.Decimal; note: string | null;
}>) {
  return {
    id:                   o.id.toString(),
    code:                 o.code,
    userId:               o.userId?.toString() ?? null,
    contactName:          o.contactName,
    contactEmail:         o.contactEmail,
    contactPhone:         o.contactPhone,
    addressSnapshot:      o.addressSnapshot,
    subtotal:             dec(o.subtotal),
    deliveryFee:          dec(o.deliveryFee),
    distanceKm:           o.distanceKm != null ? dec(o.distanceKm) : null,
    durationMinutes:      o.durationMinutes,
    deliveryFeeBreakdown: o.deliveryFeeBreakdown,
    discount:             dec(o.discount),
    total:                dec(o.total),
    currency:             o.currency,
    status:               o.status,
    paymentMethod:        o.paymentMethod,
    customerNote:         o.customerNote,
    scheduledAt:          o.scheduledAt,
    estimatedReadyAt:     o.estimatedReadyAt,
    createdAt:            o.createdAt,
    updatedAt:            o.updatedAt,
    items: items?.map(i => ({
      id:           i.id.toString(),
      dishId:       i.dishId.toString(),
      dishName:     i.dishName,
      dishImageUrl: i.dishImageUrl,
      unitPrice:    dec(i.unitPrice),
      quantity:     i.quantity,
      options:      i.optionsJson,
      lineTotal:    dec(i.lineTotal),
      note:         i.note,
    })),
  }
}

// =====================================================================
// Handlers
// =====================================================================

export async function create(req: Request, res: Response) {
  const body   = createOrderSchema.parse(req.body)
  const userId = req.user ? BigInt(req.user.sub) : null
  const guestEmail = req.guestOtp?.email ?? null

  // Guest: contact_email phải khớp email đã verify OTP
  if (!userId) {
    if (!guestEmail) throw Forbidden('order.guest_token_required', 'GUEST_TOKEN_REQUIRED')
    if (guestEmail !== body.contact_email) {
      throw Forbidden('order.guest_email_mismatch', 'GUEST_EMAIL_MISMATCH')
    }
  }

  // Customer: chặn nếu account bị admin deactivate (is_active=false)
  // — JWT có thể vẫn valid trong 15 phút TTL, lookup DB để chặn ngay.
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } })
    if (!u || !u.isActive) {
      throw Forbidden('user.account_disabled', 'ACCOUNT_DISABLED')
    }
  }

  // 1) Resolve address (geocode nếu cần)
  const address = await resolveAddress(userId, body)

  // 2) Validate items + tính giá snapshot
  const priced = await validateAndPriceItems(body.items)

  // 3) Load store settings (origin + công thức ship)
  const store = await prisma.storeSettings.findUnique({ where: { id: 1 } })
  if (!store)             throw BadRequest('order.store_unconfigured', 'STORE_UNCONFIGURED')
  if (!store.isOpen)      throw Forbidden('order.store_closed', 'STORE_CLOSED')
  if (!store.lat || !store.lng) throw BadRequest('order.store_no_origin', 'STORE_NO_ORIGIN')

  // 4) Routing OSRM (server-side) — distance/duration thật
  const route = await routeDriving(
    { lat: Number(store.lat), lng: Number(store.lng) },
    { lat: address.lat!,      lng: address.lng!     },
  )
  if (!route) throw BadRequest('order.routing_failed', 'ROUTING_FAILED')

  // 5) Subtotal + delivery fee (recompute từ DB, KHÔNG tin FE)
  const subtotal = computeSubtotal(priced)
  const ship = computeDeliveryFee({
    distanceKm:        route.distanceKm,
    subtotal,
    deliveryBaseFee:   dec(store.deliveryBaseFee),
    deliveryPerKm:     dec(store.deliveryPerKm),
    freeShipThreshold: store.freeShipThreshold ? dec(store.freeShipThreshold) : null,
    radiusKm:          dec(store.deliveryRadiusKm),
  }, store.routingProvider)

  if (ship.outOfZone) {
    throw BadRequest('order.out_of_zone', 'OUT_OF_ZONE', {
      distance_km: ship.breakdown.distanceKm,
      radius_km:   ship.breakdown.radiusKm,
    })
  }

  const discount = 0
  const total    = round2(subtotal + ship.fee - discount)

  // 6) Tính ETA: scheduled hoặc now + prep + duration
  let estimatedReadyAt: Date
  if (body.scheduled_at) {
    estimatedReadyAt = new Date(body.scheduled_at)
    if (Number.isNaN(estimatedReadyAt.getTime())) {
      throw BadRequest('order.invalid_scheduled_at', 'INVALID_SCHEDULED_AT')
    }
  } else {
    const prep = store.kitchenPrepMinutes ?? 25
    estimatedReadyAt = new Date(Date.now() + (prep + route.durationMinutes) * 60_000)
  }

  // 7) Tạo order trong transaction (retry tối đa 3 lần nếu trùng code)
  const addressSnapshotJson = {
    recipient:   address.recipient,
    phone:       address.phone,
    line:        address.line,
    ward:        address.ward,
    district:    address.district,
    city:        address.city,
    country:     address.country,
    postal_code: address.postalCode,
    lat:         address.lat,
    lng:         address.lng,
    note:        address.note,
  } as const

  const breakdown = {
    distance_km:        ship.breakdown.distanceKm,
    duration_minutes:   Math.round(route.durationMinutes),
    per_km:             ship.breakdown.perKm,
    base_fee:           ship.breakdown.baseFee,
    threshold:          ship.breakdown.threshold,
    free_ship_applied:  ship.freeShipApplied,
    radius_km:          ship.breakdown.radiusKm,
    eta_at:             estimatedReadyAt.toISOString(),
    store_lat:          Number(store.lat),
    store_lng:          Number(store.lng),
    provider:           ship.breakdown.provider,
    alternatives_count: route.alternativesCount,  // audit: số tuyến OSRM đề xuất
    selection_strategy: 'min_distance',           // audit: chiến lược pick tuyến
  } as const

  let order: Awaited<ReturnType<typeof createOrderTx>> | null = null
  let attempt = 0
  let lastErr: unknown = null
  while (attempt < 3) {
    attempt++
    const code = generateCode()
    try {
      order = await createOrderTx({
        code,
        userId,
        body,
        address,
        addressSnapshotJson,
        priced,
        subtotal,
        deliveryFee: ship.fee,
        distanceKm:  route.distanceKm,
        durationMinutes: Math.round(route.durationMinutes),
        breakdown,
        discount,
        total,
        estimatedReadyAt,
        scheduledAt: body.scheduled_at ? new Date(body.scheduled_at) : null,
      })
      break
    } catch (e) {
      lastErr = e
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        continue // code collision — retry
      }
      throw e
    }
  }
  if (!order) throw lastErr ?? BadRequest('order.create_failed', 'CREATE_FAILED')

  // 8) Payment instructions
  const paymentInstructions = shapePaymentInstructions(
    body.payment_method, total, order.code, store,
  )

  // 9) Guest token vĩnh viễn (TTL 30 ngày) cho tra cứu đơn sau này
  let guestToken: string | undefined
  if (!userId) {
    guestToken = signGuestToken(
      { orderCode: order.code, email: body.contact_email, type: 'guest_order' },
      '30d',
    )
  }

  // Push realtime tới staff dashboard (room: staff:orders) — chạy fire-and-forget,
  // không block response cho khách.
  try {
    emitOrderCreated({
      id:            order.id.toString(),
      code:          order.code,
      total:         Number(order.total),
      currency:      order.currency,
      status:        order.status,
      paymentMethod: order.paymentMethod,
      contactName:   order.contactName,
      contactPhone:  order.contactPhone,
      contactEmail:  order.contactEmail,
      itemCount:     order.items.reduce((s, i) => s + i.quantity, 0),
      subtotal:      Number(order.subtotal),
      deliveryFee:   Number(order.deliveryFee),
      distanceKm:    order.distanceKm != null ? Number(order.distanceKm) : null,
      createdAt:     order.createdAt.toISOString(),
      isGuest:       order.userId == null,
    })
  } catch (e) {
    console.warn('[socket] emit order.created failed:', e)
  }

  // Persistent notification cho staff/admin (broadcast, userId=null)
  try {
    await createNotification({
      type:        'order_created',
      entityType:  'order',
      entityId:    order.id,
      actionUrl:   `/admin/orders/${order.code}`,
      metadata:    {
        code:          order.code,
        contactName:   order.contactName,
        contactPhone:  order.contactPhone,
        total:         Number(order.total),
        currency:      order.currency,
        status:        order.status,
        paymentMethod: order.paymentMethod,
        itemCount:     order.items.reduce((s, i) => s + i.quantity, 0),
        isGuest:       order.userId == null,
      },
    })
  } catch (e) {
    console.warn('[notif] create order_created failed:', e)
  }

  res.status(201).json({
    order: shapeOrder(order, order.items),
    paymentInstructions,
    guestToken,
  })
}

async function createOrderTx(input: {
  code: string
  userId: bigint | null
  body: z.infer<typeof createOrderSchema>
  address: ResolvedAddress
  addressSnapshotJson: Record<string, unknown>
  priced: PricedItem[]
  subtotal: number
  deliveryFee: number
  distanceKm: number
  durationMinutes: number
  breakdown: Record<string, unknown>
  discount: number
  total: number
  estimatedReadyAt: Date
  scheduledAt: Date | null
}) {
  return prisma.$transaction(async tx => {
    const o = await tx.order.create({
      data: {
        code:                  input.code,
        userId:                input.userId,
        contactName:           input.body.contact_name,
        contactEmail:          input.body.contact_email,
        contactPhone:          input.body.contact_phone,
        emailVerifiedAt:       input.userId ? undefined : new Date(),
        addressSnapshot:       input.addressSnapshotJson as Prisma.InputJsonValue,
        subtotal:              new Prisma.Decimal(input.subtotal),
        deliveryFee:           new Prisma.Decimal(input.deliveryFee),
        distanceKm:            new Prisma.Decimal(input.distanceKm.toFixed(2)),
        durationMinutes:       input.durationMinutes,
        deliveryFeeBreakdown:  input.breakdown as Prisma.InputJsonValue,
        discount:              new Prisma.Decimal(input.discount),
        total:                 new Prisma.Decimal(input.total),
        currency:              'EUR',
        status:                'pending_payment',
        paymentMethod:         input.body.payment_method,
        customerNote:          input.body.customer_note ?? null,
        estimatedReadyAt:      input.estimatedReadyAt,
        scheduledAt:           input.scheduledAt,
      },
    })

    await tx.orderItem.createMany({
      data: input.priced.map(p => ({
        orderId:      o.id,
        dishId:       p.dishId,
        dishName:     p.dishName,
        dishImageUrl: p.dishImageUrl,
        unitPrice:    new Prisma.Decimal(p.unitPrice),
        quantity:     p.quantity,
        optionsJson:  p.optionsJson.length > 0
          ? (p.optionsJson as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        lineTotal:    new Prisma.Decimal(p.lineTotal),
        note:         p.note,
      })),
    })

    await tx.orderStatusHistory.create({
      data: {
        orderId:    o.id,
        fromStatus: null,
        toStatus:   'pending_payment',
        changedBy:  input.userId,
        source:     input.userId ? 'customer' : 'system',
        note:       null,
      },
    })

    // Customer: clear cart (transaction safety)
    if (input.userId) {
      const cart = await tx.cart.findUnique({ where: { userId: input.userId } })
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      }
    }

    const items = await tx.orderItem.findMany({
      where:   { orderId: o.id },
      orderBy: { id: 'asc' },
    })

    return { ...o, items }
  })
}

// ----- READ -----

export async function getByCode(req: Request, res: Response) {
  const code = req.params.code
  const order = await prisma.order.findUnique({
    where:   { code },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  if (!order) throw NotFound('order.not_found')

  // Access check
  const userId   = req.user ? BigInt(req.user.sub) : null
  const role     = req.user?.role
  const guestEm  = req.guestOtp?.email
  const guestOc  = req.guestOtp?.orderCode
  const lookupEm = req.guestLookup?.email

  const allowed =
    (role === 'staff' || role === 'admin')                                       ||
    (order.userId != null && userId != null && order.userId === userId)          ||
    (guestEm && guestOc && guestOc === order.code && guestEm === order.contactEmail) ||
    (lookupEm && lookupEm === order.contactEmail)

  if (!allowed) throw Forbidden('order.no_access', 'NO_ACCESS')

  res.json({ order: shapeOrder(order, order.items) })
}

/**
 * POST /api/orders/lookup/check — kiểm tra email này có đơn nào không TRƯỚC khi
 * gửi OTP, để guest không phải verify rồi mới nhận thông báo "không có đơn".
 *
 * Có rate-limit per-IP (lookupCheckLimiter) để chống enumerate hàng loạt.
 * Chỉ trả `{ hasOrders: boolean }` — không leak count/info đơn cụ thể.
 */
const lookupCheckSchema = z.object({
  email: z.string().email().toLowerCase(),
})

export async function lookupCheck(req: Request, res: Response) {
  const { email } = lookupCheckSchema.parse(req.body)
  const found = await prisma.order.findFirst({
    where:  { contactEmail: email },
    select: { id: true },
  })
  res.json({ hasOrders: !!found })
}

/**
 * GET /api/orders/lookup — guest tra cứu list đơn của email mình (cần lookup token
 * từ /otp/verify purpose='order_lookup'). KHÔNG cần JWT customer.
 *
 * Bảo mật: chỉ trả những đơn `contactEmail = email trong token`. Không enumerate
 * theo SĐT/tên vì sẽ thành kênh dò địa chỉ người khác.
 */
export async function listByLookup(req: Request, res: Response) {
  const email = req.guestLookup!.email
  const orders = await prisma.order.findMany({
    where:   { contactEmail: email },
    orderBy: { createdAt: 'desc' },
    take:    50,
    include: { items: { orderBy: { id: 'asc' } } },
  })
  res.json({ orders: orders.map(o => shapeOrder(o, o.items)) })
}

export async function listMine(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const orders = await prisma.order.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
    include: { items: { orderBy: { id: 'asc' } } },
  })
  res.json({ orders: orders.map(o => shapeOrder(o, o.items)) })
}

// ----- ADMIN/STAFF: list tất cả đơn -----

/**
 * Admin list filters — mỗi field là 1 partial match riêng (AND logic).
 * Empty/undefined → bỏ qua field đó. Tất cả case-insensitive vì collation
 * utf8mb4_unicode_ci đã CI.
 */
const adminListQuery = z.object({
  status:          z.enum(['pending_payment','paid','preparing','delivering','completed','cancelled']).optional(),
  code:            z.string().trim().min(1).max(50).optional(),
  customerName:    z.string().trim().min(1).max(100).optional(),
  customerPhone:   z.string().trim().min(1).max(50).optional(),
  customerEmail:   z.string().trim().min(1).max(191).optional(),
  deliveryAddress: z.string().trim().min(1).max(255).optional(),
  sort:            z.enum(['created_desc','created_asc','total_desc','total_asc']).default('created_desc'),
  limit:           z.coerce.number().int().min(1).max(100).default(20),
  offset:          z.coerce.number().int().min(0).default(0),
})

export async function listForAdmin(req: Request, res: Response) {
  const q = adminListQuery.parse(req.query)

  const where: Prisma.OrderWhereInput = {
    ...(q.status        ? { status:       q.status                          } : {}),
    ...(q.code          ? { code:         { contains: q.code          } } : {}),
    ...(q.customerName  ? { contactName:  { contains: q.customerName  } } : {}),
    ...(q.customerPhone ? { contactPhone: { contains: q.customerPhone } } : {}),
    ...(q.customerEmail ? { contactEmail: { contains: q.customerEmail } } : {}),
    // JSON path filter cho address_snapshot.line — MySQL hỗ trợ qua Prisma 5.
    ...(q.deliveryAddress ? {
      addressSnapshot: {
        path:            '$.line',
        string_contains: q.deliveryAddress,
      },
    } : {}),
  }

  const orderBy: Prisma.OrderOrderByWithRelationInput = (() => {
    switch (q.sort) {
      case 'created_asc':  return { createdAt: 'asc'  }
      case 'total_desc':   return { total:     'desc' }
      case 'total_asc':    return { total:     'asc'  }
      case 'created_desc':
      default:             return { createdAt: 'desc' }
    }
  })()

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      take:    q.limit,
      skip:    q.offset,
      include: { items: { orderBy: { id: 'asc' } } },
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    orders: orders.map(o => shapeOrder(o, o.items)),
    total,
    limit:  q.limit,
    offset: q.offset,
    sort:   q.sort,
  })
}

// =====================================================================
// State machine + role guards (theo FEATURES.md §7)
// =====================================================================

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
type Role        = 'customer' | 'staff' | 'admin'

interface Transition {
  to:    OrderStatus
  roles: Role[]
}

const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  pending_payment: [
    { to: 'paid',      roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['staff', 'admin'] },
  ],
  paid: [
    { to: 'preparing', roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['admin'] },           // refund
  ],
  preparing: [
    { to: 'delivering', roles: ['staff', 'admin'] },
    { to: 'cancelled',  roles: ['admin'] },
  ],
  delivering: [
    { to: 'completed', roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['staff', 'admin'] },  // delivery failed
  ],
  completed: [
    { to: 'cancelled', roles: ['admin'] },           // refund post-completion
  ],
  cancelled: [],
}

function findTransition(from: OrderStatus, to: OrderStatus, role: Role): Transition | null {
  if (from === to) return null
  // Admin có quyền override state machine — chuyển sang bất kỳ status nào (kể cả
  // ngược chiều). Side-effect fields (paidAt, deliveredAt, cancelledAt...) vẫn
  // được set khớp với `to`. Hành động này log vào order_status_history nên audit
  // được sau này.
  if (role === 'admin') return { to, roles: ['admin'] }
  // Staff: bị giới hạn theo state machine
  const t = TRANSITIONS[from]?.find(x => x.to === to && x.roles.includes(role))
  return t ?? null
}

// =====================================================================
// POST /api/orders/:code/status — change status
// =====================================================================

const changeStatusSchema = z.object({
  to:                z.enum(['pending_payment','paid','preparing','delivering','completed','cancelled']),
  reason:            z.string().trim().min(1).max(255).optional(),
  bankTxId:          z.string().trim().min(1).max(100).optional(),
  paymentReference:  z.string().trim().min(1).max(100).optional(),
  note:              z.string().trim().min(1).max(255).optional(),
})

export async function changeStatus(req: Request, res: Response) {
  const role = req.user!.role as Role
  const code = req.params.code
  const body = changeStatusSchema.parse(req.body)

  const order = await prisma.order.findUnique({ where: { code } })
  if (!order) throw NotFound('order.not_found')

  const from = order.status as OrderStatus
  const to   = body.to

  if (from === to) {
    throw BadRequest('order.status_same', 'STATUS_SAME')
  }

  const transition = findTransition(from, to, role)
  if (!transition) {
    throw Forbidden('order.transition_forbidden', 'TRANSITION_FORBIDDEN', { from, to, role })
  }

  // Cancel cần reason
  if (to === 'cancelled' && !body.reason) {
    throw BadRequest('order.cancel_reason_required', 'CANCEL_REASON_REQUIRED')
  }

  const actorId = BigInt(req.user!.sub)
  const now     = new Date()

  const updateData: Prisma.OrderUpdateInput = { status: to }

  if (to === 'paid') {
    updateData.paidAt = now
    updateData.paymentConfirmer = { connect: { id: actorId } }
    if (body.bankTxId)         updateData.bankTxId         = body.bankTxId
    if (body.paymentReference) updateData.paymentReference = body.paymentReference
  }
  if (to === 'completed') {
    updateData.deliveredAt = now
  }
  if (to === 'cancelled') {
    updateData.cancelledAt     = now
    updateData.cancelledReason = body.reason
    updateData.canceller       = { connect: { id: actorId } }
  }

  const updated = await prisma.$transaction(async tx => {
    const u = await tx.order.update({ where: { code }, data: updateData })
    await tx.orderStatusHistory.create({
      data: {
        orderId:    u.id,
        fromStatus: from,
        toStatus:   to,
        changedBy:  actorId,
        source:     role,
        note:       body.note ?? body.reason ?? null,
      },
    })
    return u
  })

  // Realtime push to staff dashboard + customer order room
  try {
    emitOrderStatusChanged({
      code:    updated.code,
      from,
      to,
      at:      now.toISOString(),
    })
  } catch (e) {
    console.warn('[socket] emit order.status_changed failed:', e)
  }

  // Persistent notification — type tùy thuộc transition (paid → payment_received,
  // cancelled → order_cancelled, các trường hợp khác → order_status_changed)
  try {
    const notifType =
      to === 'paid'      ? 'payment_received' :
      to === 'cancelled' ? 'order_cancelled'  :
                           'order_status_changed'
    await createNotification({
      type:       notifType,
      entityType: 'order',
      entityId:   updated.id,
      actionUrl:  `/admin/orders/${updated.code}`,
      metadata:   {
        code:   updated.code,
        from,
        to,
        reason: body.reason ?? null,
      },
    })
  } catch (e) {
    console.warn('[notif] create status_changed failed:', e)
  }

  // Return full order
  const fresh = await prisma.order.findUnique({
    where:   { code },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  res.json({ order: fresh ? shapeOrder(fresh, fresh.items) : null })
}

// =====================================================================
// PATCH /api/orders/:code — admin edit limited fields
// =====================================================================

/**
 * Address fields admin có thể sửa. Merge vào `addressSnapshot` JSON.
 * KHÔNG recompute delivery_fee khi address đổi — giữ phí ship gốc của đơn.
 * Nếu admin sửa quá xa và muốn cập nhật phí, làm thủ công ở V2.
 */
const addressEditSchema = z.object({
  recipient:   z.string().trim().min(2).max(100).optional(),
  phone:       z.string()
                  .trim()
                  .transform(v => v.replace(/[\s\-()]/g, ''))
                  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })
                  .optional(),
  line:        z.string().trim().min(5).max(255).optional(),
  ward:        z.string().max(100).nullable().optional(),
  district:    z.string().max(100).nullable().optional(),
  city:        z.string().trim().max(100).optional(),
  country:     z.string().length(2).optional(),
  postal_code: z.string().max(20).nullable().optional(),
  lat:         z.number().min(-90).max(90).nullable().optional(),
  lng:         z.number().min(-180).max(180).nullable().optional(),
  note:        z.string().max(255).nullable().optional(),
})

const editOrderSchema = z.object({
  customerNote:  z.string().trim().max(500).optional(),
  contactName:   z.string().trim().min(2).max(100).optional(),
  contactPhone:  z.string()
                   .trim()
                   .transform(v => v.replace(/[\s\-()]/g, ''))
                   .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })
                   .optional(),
  scheduledAt:   z.string().datetime().nullable().optional(),
  address:       addressEditSchema.optional(),
}).refine(d =>
  d.customerNote !== undefined || d.contactName !== undefined ||
  d.contactPhone !== undefined || d.scheduledAt !== undefined ||
  d.address      !== undefined,
  { message: 'validation.required' },
)

export async function adminUpdateOrder(req: Request, res: Response) {
  const code = req.params.code
  const body = editOrderSchema.parse(req.body)

  const order = await prisma.order.findUnique({ where: { code } })
  if (!order) throw NotFound('order.not_found')

  const data: Prisma.OrderUpdateInput = {}
  if (body.customerNote !== undefined) data.customerNote = body.customerNote || null
  if (body.contactName  !== undefined) data.contactName  = body.contactName
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone
  if (body.scheduledAt  !== undefined) data.scheduledAt  = body.scheduledAt ? new Date(body.scheduledAt) : null

  // Merge address fields vào addressSnapshot JSON. Field nào undefined → giữ value cũ.
  if (body.address) {
    const existing = (order.addressSnapshot ?? {}) as Record<string, unknown>
    const patch: Record<string, unknown> = { ...existing }
    for (const [k, v] of Object.entries(body.address)) {
      if (v !== undefined) patch[k] = v
    }
    data.addressSnapshot = patch as Prisma.InputJsonValue
  }

  const updated = await prisma.order.update({
    where:   { code },
    data,
    include: { items: { orderBy: { id: 'asc' } } },
  })
  res.json({ order: shapeOrder(updated, updated.items) })
}

// =====================================================================
// DELETE /api/orders/:code — soft cancel (alias của POST /status với to=cancelled)
// =====================================================================

const cancelSchema = z.object({
  reason: z.string().trim().min(1).max(255),
})

export async function adminCancelOrder(req: Request, res: Response) {
  const role = req.user!.role as Role
  const code = req.params.code
  const body = cancelSchema.parse(req.body)

  const order = await prisma.order.findUnique({ where: { code } })
  if (!order) throw NotFound('order.not_found')

  const from = order.status as OrderStatus
  if (from === 'cancelled') {
    throw BadRequest('order.already_cancelled', 'ALREADY_CANCELLED')
  }

  // Admin có thể cancel ở mọi state, staff chỉ một số state
  const allowed =
    role === 'admin' ||
    (role === 'staff' && (from === 'pending_payment' || from === 'delivering'))
  if (!allowed) {
    throw Forbidden('order.transition_forbidden', 'TRANSITION_FORBIDDEN', { from, to: 'cancelled', role })
  }

  const actorId = BigInt(req.user!.sub)
  const now     = new Date()

  await prisma.$transaction(async tx => {
    await tx.order.update({
      where: { code },
      data: {
        status:          'cancelled',
        cancelledAt:     now,
        cancelledReason: body.reason,
        canceller:       { connect: { id: actorId } },
      },
    })
    await tx.orderStatusHistory.create({
      data: {
        orderId:    order.id,
        fromStatus: from,
        toStatus:   'cancelled',
        changedBy:  actorId,
        source:     role,
        note:       body.reason,
      },
    })
  })

  try {
    emitOrderStatusChanged({ code, from, to: 'cancelled', at: now.toISOString() })
  } catch (e) {
    console.warn('[socket] emit cancel failed:', e)
  }

  // Persistent notification cho cancel
  try {
    await createNotification({
      type:       'order_cancelled',
      entityType: 'order',
      entityId:   order.id,
      actionUrl:  `/admin/orders/${code}`,
      metadata:   { code, from, to: 'cancelled', reason: body.reason },
    })
  } catch (e) {
    console.warn('[notif] create cancel failed:', e)
  }

  const fresh = await prisma.order.findUnique({
    where:   { code },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  res.json({ order: fresh ? shapeOrder(fresh, fresh.items) : null })
}
