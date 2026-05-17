import type { Request, Response } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, Forbidden, NotFound } from '@/lib/errors'
import { generateTempPassword, hashPassword } from '@/lib/passwords'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'
import { sendMail } from '@/lib/mailer'
import { renderAccountDeactivatedEmail, renderAccountReactivatedEmail } from '@/lib/emailTemplates'
import { detectLocale } from '@/i18n'

// =====================================================================
// GET /api/admin/customers
// List customers (role=customer) với computed stats: totalOrders, totalSpent,
// lastOrderAt. Hỗ trợ search + sort + pagination.
// =====================================================================

const listQuerySchema = z.object({
  q:      z.string().trim().min(1).max(100).optional(),
  sort:   z.enum([
            'created_desc','created_asc',
            'name_asc','name_desc',
            'total_spent_desc','total_spent_asc',
            'total_orders_desc','total_orders_asc',
            'last_order_desc','last_order_asc',
          ]).default('created_desc'),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function listCustomers(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query)

  const where: Prisma.UserWhereInput = {
    role: 'customer',
    ...(q.status === 'active'   ? { isActive: true  } : {}),
    ...(q.status === 'inactive' ? { isActive: false } : {}),
    ...(q.q ? {
      OR: [
        { email:    { contains: q.q } },
        { fullName: { contains: q.q } },
        { phone:    { contains: q.q } },
      ],
    } : {}),
  }

  // Sort theo computed fields cần aggregation trước. Để đơn giản, mình query
  // tất cả users matching, aggregate orders, rồi sort + paginate trong JS.
  // OK với scale nhỏ (vài nghìn customer). Khi lớn dùng raw SQL với JOIN.
  //
  // Sort theo column trực tiếp (created/name) thì paginate trực tiếp DB.
  const useDbSort = q.sort === 'created_desc' || q.sort === 'created_asc'
                 || q.sort === 'name_desc'    || q.sort === 'name_asc'

  if (useDbSort) {
    const orderBy: Prisma.UserOrderByWithRelationInput =
      q.sort === 'created_asc'  ? { createdAt: 'asc'  } :
      q.sort === 'created_desc' ? { createdAt: 'desc' } :
      q.sort === 'name_asc'     ? { fullName:  'asc'  } :
                                  { fullName:  'desc' }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        take:    q.limit,
        skip:    q.offset,
        select:  selectFields,
      }),
      prisma.user.count({ where }),
    ])

    const ids = rows.map(r => r.id)
    const stats = await aggregateOrderStats(ids)
    res.json({
      customers: rows.map(r => shape(r, stats.get(r.id.toString()))),
      total,
      limit:  q.limit,
      offset: q.offset,
      sort:   q.sort,
    })
    return
  }

  // Sort theo stats — cần aggregate full result rồi sort trong JS
  const total = await prisma.user.count({ where })
  const allRows = await prisma.user.findMany({
    where,
    orderBy: { id: 'asc' },  // ổn định trước khi sort
    select:  selectFields,
  })
  const ids = allRows.map(r => r.id)
  const stats = await aggregateOrderStats(ids)

  const enriched = allRows.map(r => shape(r, stats.get(r.id.toString())))
  enriched.sort((a, b) => {
    switch (q.sort) {
      case 'total_spent_desc':  return b.totalSpent - a.totalSpent
      case 'total_spent_asc':   return a.totalSpent - b.totalSpent
      case 'total_orders_desc': return b.totalOrders - a.totalOrders
      case 'total_orders_asc':  return a.totalOrders - b.totalOrders
      case 'last_order_desc':   return (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? '')
      case 'last_order_asc':    return (a.lastOrderAt ?? '').localeCompare(b.lastOrderAt ?? '')
      default:                  return 0
    }
  })
  const paged = enriched.slice(q.offset, q.offset + q.limit)

  res.json({
    customers: paged,
    total,
    limit:  q.limit,
    offset: q.offset,
    sort:   q.sort,
  })
}

// =====================================================================
// GET /api/admin/customers/:id
// =====================================================================

export async function getCustomer(req: Request, res: Response) {
  const id = BigInt(req.params.id)

  const user = await prisma.user.findUnique({
    where:  { id },
    select: {
      ...selectFields,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id:         true,
          recipient:  true,
          phone:      true,
          line:       true,
          city:       true,
          postalCode: true,
          country:    true,
          isDefault:  true,
        },
      },
    },
  })
  if (!user || user.role !== 'customer') throw NotFound('user.not_found')

  // Aggregate parallel queries
  const [
    stats,
    recentOrders,
    statusGroups,
    paymentGroups,
    topDishesRaw,
  ] = await Promise.all([
    aggregateOrderStats([user.id]),
    prisma.order.findMany({
      where:    { userId: user.id },
      orderBy:  { createdAt: 'desc' },
      take:     20,
      select: {
        id: true, code: true, status: true, total: true, currency: true,
        createdAt: true, paymentMethod: true,
      },
    }),
    // Status breakdown (kể cả cancelled)
    prisma.order.groupBy({
      by:     ['status'],
      where:  { userId: user.id },
      _count: { _all: true },
    }),
    // Payment method breakdown (chỉ đơn ko cancel)
    prisma.order.groupBy({
      by:     ['paymentMethod'],
      where:  { userId: user.id, status: { not: 'cancelled' } },
      _count: { _all: true },
      _sum:   { total: true },
    }),
    // Top 5 dishes ordered (theo tổng quantity, chỉ đơn ko cancel)
    prisma.orderItem.groupBy({
      by:     ['dishId'],
      where:  { order: { userId: user.id, status: { not: 'cancelled' } } },
      _sum:   { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take:   5,
    }),
  ])

  // Fetch dish names cho top dishes
  const dishIds = topDishesRaw.map(t => t.dishId)
  const dishes = dishIds.length > 0
    ? await prisma.dish.findMany({
        where:  { id: { in: dishIds } },
        select: { id: true, slug: true, nameVi: true, imageUrl: true },
      })
    : []
  const dishMap = new Map(dishes.map(d => [d.id.toString(), d]))
  const topDishes = topDishesRaw.map(t => {
    const d = dishMap.get(t.dishId.toString())
    return {
      dishId:   t.dishId.toString(),
      slug:     d?.slug   ?? null,
      name:     d?.nameVi ?? '(deleted)',
      imageUrl: d?.imageUrl ?? null,
      quantity: t._sum.quantity ?? 0,
    }
  })

  // Computed analytics
  const totalOrdersAll = statusGroups.reduce((s, g) => s + g._count._all, 0)
  const cancelledCount = statusGroups.find(g => g.status === 'cancelled')?._count._all ?? 0
  const s = stats.get(user.id.toString())
  const totalSpent  = s?.totalSpent  ?? 0
  const totalOrders = s?.totalOrders ?? 0  // excl. cancelled
  const aov         = totalOrders > 0 ? totalSpent / totalOrders : 0
  const cancelRate  = totalOrdersAll > 0 ? cancelledCount / totalOrdersAll : 0

  const now = Date.now()
  const daysSinceSignup = Math.floor((now - user.createdAt.getTime()) / 86_400_000)
  const daysSinceLastOrder = s?.lastOrderAt
    ? Math.floor((now - new Date(s.lastOrderAt).getTime()) / 86_400_000)
    : null

  res.json({
    customer: {
      ...shape(user, s),
      addresses: user.addresses.map(a => ({
        id:         a.id.toString(),
        recipient:  a.recipient,
        phone:      a.phone,
        line:       a.line,
        city:       a.city,
        postalCode: a.postalCode,
        country:    a.country,
        isDefault:  a.isDefault,
      })),
      recentOrders: recentOrders.map(o => ({
        id:            o.id.toString(),
        code:          o.code,
        status:        o.status,
        total:         Number(o.total),
        currency:      o.currency,
        paymentMethod: o.paymentMethod,
        createdAt:     o.createdAt,
      })),

      // Analytics
      analytics: {
        aov,
        cancelRate,
        daysSinceSignup,
        daysSinceLastOrder,
        totalOrdersAll,            // including cancelled
        statusBreakdown: statusGroups.map(g => ({
          status: g.status,
          count:  g._count._all,
        })),
        paymentBreakdown: paymentGroups.map(g => ({
          method: g.paymentMethod,
          count:  g._count._all,
          total:  g._sum.total != null ? Number(g._sum.total) : 0,
        })),
        topDishes,
      },
    },
  })
}

// =====================================================================
// PATCH /api/admin/customers/:id — edit fullName, phone
// =====================================================================

const phoneSchema = z
  .string()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^\+?[0-9]{8,15}$/.test(v), { message: 'validation.phone_format' })

const updateSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone:    z.union([phoneSchema, z.literal(''), z.null()]).optional(),
}).refine(d => d.fullName !== undefined || d.phone !== undefined, { message: 'validation.required' })

export async function updateCustomer(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)
  const body    = updateSchema.parse(req.body)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target)                    throw NotFound('user.not_found')
  if (target.role !== 'customer') throw BadRequest('user.not_customer', 'NOT_CUSTOMER')

  const data: Prisma.UserUpdateInput = {}
  if (body.fullName !== undefined) data.fullName = body.fullName
  if (body.phone    !== undefined) data.phone    = body.phone === '' ? null : body.phone

  const updated = await prisma.user.update({ where: { id }, data, select: selectFields })

  logAuditAsync({
    action:     'admin.customer.updated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    diff:       data,
    ipAddress:  clientIp(req),
  })

  // Trả lại shape giống list để FE cập nhật row mà không cần refetch full
  const stats = await aggregateOrderStats([updated.id])
  res.json({ customer: shape(updated, stats.get(updated.id.toString())) })
}

// =====================================================================
// POST /api/admin/customers/:id/deactivate + /activate (soft delete)
// =====================================================================

const deactivateSchema = z.object({
  reason: z.string().trim().min(3, 'validation.reason_too_short').max(500, 'validation.reason_too_long'),
})

export async function deactivateCustomer(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  if (id === actorId) {
    throw Forbidden('user.cannot_deactivate_self', 'CANNOT_DEACTIVATE_SELF')
  }

  const { reason } = deactivateSchema.parse(req.body)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target)                    throw NotFound('user.not_found')
  if (target.role !== 'customer') throw BadRequest('user.not_customer', 'NOT_CUSTOMER')

  if (!target.isActive) {
    res.json({ ok: true, alreadyInactive: true })
    return
  }

  await prisma.user.update({
    where: { id },
    data:  {
      isActive:           false,
      deactivatedAt:      new Date(),
      deactivationReason: reason,
    },
  })

  logAuditAsync({
    action:     'admin.customer.deactivated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    diff:       { reason },
    ipAddress:  clientIp(req),
  })

  // Notify user qua email (best-effort — không block response).
  void (async () => {
    try {
      const locale = detectLocale(req)
      const mail = renderAccountDeactivatedEmail(locale, { name: target.fullName, reason })
      await sendMail({ to: target.email, ...mail })
    } catch (err) {
      console.error('[deactivateCustomer] mail send failed', err)
    }
  })()

  res.json({ ok: true, reason })
}

export async function activateCustomer(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target)                    throw NotFound('user.not_found')
  if (target.role !== 'customer') throw BadRequest('user.not_customer', 'NOT_CUSTOMER')

  if (target.isActive) {
    res.json({ ok: true, alreadyActive: true })
    return
  }

  await prisma.user.update({
    where: { id },
    data:  {
      isActive:           true,
      deactivatedAt:      null,
      deactivationReason: null,
    },
  })

  logAuditAsync({
    action:     'admin.customer.activated',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    ipAddress:  clientIp(req),
  })

  void (async () => {
    try {
      const locale = detectLocale(req)
      const mail = renderAccountReactivatedEmail(locale, { name: target.fullName })
      await sendMail({ to: target.email, ...mail })
    } catch (err) {
      console.error('[activateCustomer] mail send failed', err)
    }
  })()

  res.json({ ok: true })
}

// =====================================================================
// POST /api/admin/customers/:id/reset-password
// =====================================================================

export async function resetCustomerPassword(req: Request, res: Response) {
  const actorId = BigInt(req.user!.sub)
  const id      = BigInt(req.params.id)

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target)                    throw NotFound('user.not_found')
  if (target.role !== 'customer') throw BadRequest('user.not_customer', 'NOT_CUSTOMER')

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.user.update({ where: { id }, data: { passwordHash } })

  logAuditAsync({
    action:     'admin.customer.password_reset',
    entityType: 'user',
    entityId:   id,
    actorId,
    actorRole:  req.user!.role,
    ipAddress:  clientIp(req),
  })

  res.json({ tempPassword })
}

// =====================================================================
// Helpers
// =====================================================================

const selectFields = {
  id:                  true,
  email:               true,
  fullName:            true,
  phone:               true,
  role:                true,
  isActive:            true,
  deactivatedAt:       true,
  deactivationReason:  true,
  emailVerifiedAt:     true,
  lastLoginAt:         true,
  createdAt:           true,
} as const

interface CustomerStats {
  totalOrders:    number
  totalSpent:     number
  lastOrderAt:    string | null
}

async function aggregateOrderStats(userIds: bigint[]): Promise<Map<string, CustomerStats>> {
  const map = new Map<string, CustomerStats>()
  if (userIds.length === 0) return map

  // Group orders by userId. Chỉ tính order KHÔNG bị cancelled (totalSpent reflect doanh thu thực).
  const grouped = await prisma.order.groupBy({
    by:    ['userId'],
    where: {
      userId: { in: userIds },
      status: { not: 'cancelled' },
    },
    _count: { _all: true },
    _sum:   { total: true },
    _max:   { createdAt: true },
  })

  for (const g of grouped) {
    if (!g.userId) continue
    map.set(g.userId.toString(), {
      totalOrders: g._count._all,
      totalSpent:  g._sum.total != null ? Number(g._sum.total) : 0,
      lastOrderAt: g._max.createdAt ? g._max.createdAt.toISOString() : null,
    })
  }
  return map
}

function shape(u: {
  id:                  bigint
  email:               string
  fullName:            string
  phone:               string | null
  role:                string
  isActive:            boolean
  deactivatedAt:       Date | null
  deactivationReason:  string | null
  emailVerifiedAt:     Date | null
  lastLoginAt:         Date | null
  createdAt:           Date
}, stats?: CustomerStats) {
  return {
    id:                  u.id.toString(),
    email:               u.email,
    fullName:            u.fullName,
    phone:               u.phone,
    role:                u.role,
    isActive:            u.isActive,
    deactivatedAt:       u.deactivatedAt?.toISOString() ?? null,
    deactivationReason:  u.deactivationReason ?? null,
    emailVerifiedAt:     u.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt:         u.lastLoginAt?.toISOString()     ?? null,
    createdAt:           u.createdAt.toISOString(),
    totalOrders:         stats?.totalOrders ?? 0,
    totalSpent:          stats?.totalSpent  ?? 0,
    lastOrderAt:         stats?.lastOrderAt ?? null,
  }
}
