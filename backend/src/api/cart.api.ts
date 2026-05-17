import type { Request, Response } from 'express'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { BadRequest, Conflict, Forbidden, NotFound } from '@/lib/errors'

// =====================================================================
// Schemas
// =====================================================================

const bigintLike = z.union([z.string(), z.number(), z.bigint()]).transform((v, ctx) => {
  try {
    return BigInt(v as string | number | bigint)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'validation.invalid_id' })
    return z.NEVER
  }
})

const optionPairSchema = z.object({
  option_id: bigintLike,
  value_id:  bigintLike,
})

const addItemSchema = z.object({
  dish_id:  bigintLike,
  quantity: z.number().int().min(1).max(99).default(1),
  options:  z.array(optionPairSchema).optional().default([]),
  note:     z.string().max(255).optional(),
})

const updateItemSchema = z
  .object({
    quantity: z.number().int().min(0).max(99).optional(),
    note:     z.string().max(255).nullable().optional(),
  })
  .refine(d => d.quantity !== undefined || d.note !== undefined, {
    message: 'validation.required',
  })

const mergeBodySchema = z.object({
  items: z.array(addItemSchema).max(50),
})

// =====================================================================
// Helpers
// =====================================================================

type OptionPair = { option_id: bigint; value_id: bigint }

/**
 * Canonical hóa options để dedup. Sort theo (option_id, value_id) tăng dần,
 * convert BigInt → string để JSON ổn định. SHA-1 dùng làm UNIQUE key trên
 * cart_items vì MySQL không index được JSON trực tiếp.
 */
function canonicalizeOptions(opts: OptionPair[]): {
  json: Array<{ option_id: string; value_id: string }>
  hash: string
} {
  if (opts.length === 0) return { json: [], hash: '' }
  const sorted = [...opts].sort((a, b) => {
    if (a.option_id !== b.option_id) return a.option_id < b.option_id ? -1 : 1
    return a.value_id < b.value_id ? -1 : a.value_id > b.value_id ? 1 : 0
  })
  const json = sorted.map(o => ({
    option_id: o.option_id.toString(),
    value_id:  o.value_id.toString(),
  }))
  const hash = createHash('sha1').update(JSON.stringify(json)).digest('hex')
  return { json, hash }
}

/**
 * Validate options match dish (option thuộc dish, value thuộc option, option
 * required đầy đủ, option type=single không có 2 value) và tính unit price snapshot.
 */
async function validateOptionsAndPrice(dishId: bigint, opts: OptionPair[]) {
  const dish = await prisma.dish.findUnique({
    where:   { id: dishId },
    include: { options: { include: { values: { where: { isActive: true } } } } },
  })
  if (!dish)              throw NotFound('cart.dish_not_found')
  if (!dish.isAvailable)  throw BadRequest('cart.dish_unavailable', 'DISH_UNAVAILABLE')

  const optsById = new Map(dish.options.map(o => [o.id.toString(), o]))
  let priceDelta = 0
  const countByOption = new Map<string, number>()

  for (const pair of opts) {
    const optKey = pair.option_id.toString()
    const opt = optsById.get(optKey)
    if (!opt) throw BadRequest('cart.invalid_option', 'INVALID_OPTION')
    const val = opt.values.find(v => v.id === pair.value_id)
    if (!val) throw BadRequest('cart.invalid_option_value', 'INVALID_OPTION_VALUE')
    priceDelta += Number(val.priceDelta)
    const n = (countByOption.get(optKey) ?? 0) + 1
    countByOption.set(optKey, n)
    if (opt.type === 'single' && n > 1) {
      throw BadRequest('cart.single_option_multi_values', 'SINGLE_MULTI_VALUE')
    }
  }

  for (const opt of dish.options) {
    if (opt.isRequired && !countByOption.has(opt.id.toString())) {
      throw BadRequest('cart.required_option_missing', 'REQUIRED_OPTION_MISSING')
    }
  }

  return { unitPrice: Number(dish.price) + priceDelta }
}

/** 1 user = 1 cart. Tự upsert khi cần (lần GET đầu tiên hoặc add item đầu tiên). */
async function ensureCartId(
  userId: bigint,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<bigint> {
  const cart = await client.cart.upsert({
    where:  { userId },
    update: {},
    create: { userId },
  })
  return cart.id
}

function touchCart(cartId: bigint, client: Prisma.TransactionClient | typeof prisma = prisma) {
  return client.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } })
}

// =====================================================================
// View shaping (GET response)
// =====================================================================

async function loadCartView(cartId: bigint) {
  const items = await prisma.cartItem.findMany({
    where:   { cartId },
    orderBy: { createdAt: 'asc' },
    include: {
      dish: { include: { options: { include: { values: true } } } },
    },
  })

  let subtotal  = 0
  let itemCount = 0

  const shaped = items.map(it => {
    const dish     = it.dish
    const optPairs = (it.optionsJson as Array<{ option_id: string; value_id: string }> | null) ?? []

    let currentPriceDelta = 0
    let optionsAvailable  = true
    const optionDetails = optPairs.map(p => {
      const opt = dish.options.find(o => o.id.toString() === p.option_id)
      const val = opt?.values.find(v => v.id.toString() === p.value_id)
      if (!opt || !val) {
        optionsAvailable = false
        return {
          optionId:     p.option_id,
          optionNameVi: null,
          optionNameEn: null,
          valueId:      p.value_id,
          labelVi:      null,
          labelEn:      null,
          priceDelta:   0,
          isActive:     false,
        }
      }
      if (!val.isActive) optionsAvailable = false
      currentPriceDelta += Number(val.priceDelta)
      return {
        optionId:     opt.id.toString(),
        optionNameVi: opt.nameVi,
        optionNameEn: opt.nameEn,
        valueId:      val.id.toString(),
        labelVi:      val.labelVi,
        labelEn:      val.labelEn,
        priceDelta:   Number(val.priceDelta),
        isActive:     val.isActive,
      }
    })

    const currentUnitPrice  = Number(dish.price) + currentPriceDelta
    const snapshotUnitPrice = Number(it.snapshotUnitPrice)
    const lineTotal         = currentUnitPrice * it.quantity
    const priceChanged      = Math.abs(currentUnitPrice - snapshotUnitPrice) > 0.0001
    const available         = dish.isAvailable && optionsAvailable

    subtotal  += lineTotal
    itemCount += it.quantity

    return {
      id:        it.id.toString(),
      dish: {
        id:          dish.id.toString(),
        slug:        dish.slug,
        nameVi:      dish.nameVi,
        nameEn:      dish.nameEn,
        imageUrl:    dish.imageUrl,
        currency:    dish.currency,
        basePrice:   Number(dish.price),
        isAvailable: dish.isAvailable,
      },
      options:           optionDetails,
      quantity:          it.quantity,
      note:              it.note,
      snapshotUnitPrice,
      currentUnitPrice,
      lineTotal,
      priceChanged,
      available,
      createdAt:         it.createdAt,
      updatedAt:         it.updatedAt,
    }
  })

  return {
    items:    shaped,
    subtotal: round2(subtotal),
    itemCount,
    currency: 'EUR' as const,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// =====================================================================
// Handlers
// =====================================================================

export async function getCart(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const cartId = await ensureCartId(userId)
  const view   = await loadCartView(cartId)
  res.json({ cart: { id: cartId.toString(), ...view } })
}

export async function addItem(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const body   = addItemSchema.parse(req.body)

  const { unitPrice }    = await validateOptionsAndPrice(body.dish_id, body.options)
  const { json, hash }   = canonicalizeOptions(body.options)
  const cartId           = await ensureCartId(userId)

  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.cartItem.findUnique({
        where: {
          uniq_cart_dish_options: { cartId, dishId: body.dish_id, optionsHash: hash },
        },
      })
      if (existing) {
        const newQty = Math.min(existing.quantity + body.quantity, 99)
        await tx.cartItem.update({
          where: { id: existing.id },
          data:  {
            quantity:          newQty,
            // Refresh snapshot — user vừa add lại, intent là "biết giá hiện tại"
            snapshotUnitPrice: new Prisma.Decimal(unitPrice),
            ...(body.note !== undefined ? { note: body.note } : {}),
          },
        })
      } else {
        await tx.cartItem.create({
          data: {
            cartId,
            dishId:            body.dish_id,
            quantity:          body.quantity,
            optionsJson:       json.length > 0 ? json : Prisma.DbNull,
            optionsHash:       hash,
            snapshotUnitPrice: new Prisma.Decimal(unitPrice),
            note:              body.note ?? null,
          },
        })
      }
      await touchCart(cartId, tx)
    })
  } catch (e) {
    // Race: hai request cùng add → 1 thắng UNIQUE, 1 thua P2002
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw Conflict('cart.race_retry', 'CART_RACE_RETRY')
    }
    throw e
  }

  const view = await loadCartView(cartId)
  res.status(201).json({ cart: { id: cartId.toString(), ...view } })
}

export async function updateItem(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const itemId = BigInt(req.params.itemId)
  const body   = updateItemSchema.parse(req.body)

  const item = await prisma.cartItem.findUnique({
    where:   { id: itemId },
    include: { cart: true },
  })
  if (!item)                       throw NotFound('cart.item_not_found')
  if (item.cart.userId !== userId) throw Forbidden('cart.not_owner')

  if (body.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } })
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
        ...(body.note     !== undefined ? { note:     body.note }     : {}),
      },
    })
  }
  await touchCart(item.cartId)

  const view = await loadCartView(item.cartId)
  res.json({ cart: { id: item.cartId.toString(), ...view } })
}

export async function deleteItem(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const itemId = BigInt(req.params.itemId)

  const item = await prisma.cartItem.findUnique({
    where:   { id: itemId },
    include: { cart: true },
  })
  if (!item)                       throw NotFound('cart.item_not_found')
  if (item.cart.userId !== userId) throw Forbidden('cart.not_owner')

  await prisma.cartItem.delete({ where: { id: itemId } })
  await touchCart(item.cartId)

  const view = await loadCartView(item.cartId)
  res.json({ cart: { id: item.cartId.toString(), ...view } })
}

export async function clearCart(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const cartId = await ensureCartId(userId)
  await prisma.cartItem.deleteMany({ where: { cartId } })
  await touchCart(cartId)
  res.json({
    cart: { id: cartId.toString(), items: [], subtotal: 0, itemCount: 0, currency: 'EUR' },
  })
}

/**
 * POST /api/cart/merge — gộp cart localStorage (gửi trong body) vào cart server
 * sau khi user login. Trùng dish + options → cộng quantity (clamp 99); khác → thêm row.
 */
export async function mergeCart(req: Request, res: Response) {
  const userId = BigInt(req.user!.sub)
  const body   = mergeBodySchema.parse(req.body)
  const cartId = await ensureCartId(userId)

  // Validate + tính giá trước transaction để fail nhanh, không giữ lock DB lâu
  const prepared: Array<{
    dishId:    bigint
    quantity:  number
    note:      string | null
    canonical: ReturnType<typeof canonicalizeOptions>['json']
    hash:      string
    unitPrice: number
  }> = []
  for (const it of body.items) {
    const { unitPrice }  = await validateOptionsAndPrice(it.dish_id, it.options)
    const { json, hash } = canonicalizeOptions(it.options)
    prepared.push({
      dishId:    it.dish_id,
      quantity:  it.quantity,
      note:      it.note ?? null,
      canonical: json,
      hash,
      unitPrice,
    })
  }

  await prisma.$transaction(async tx => {
    for (const p of prepared) {
      const existing = await tx.cartItem.findUnique({
        where: {
          uniq_cart_dish_options: { cartId, dishId: p.dishId, optionsHash: p.hash },
        },
      })
      if (existing) {
        const newQty = Math.min(existing.quantity + p.quantity, 99)
        await tx.cartItem.update({
          where: { id: existing.id },
          data:  { quantity: newQty },
        })
      } else {
        await tx.cartItem.create({
          data: {
            cartId,
            dishId:            p.dishId,
            quantity:          p.quantity,
            optionsJson:       p.canonical.length > 0 ? p.canonical : Prisma.DbNull,
            optionsHash:       p.hash,
            snapshotUnitPrice: new Prisma.Decimal(p.unitPrice),
            note:              p.note,
          },
        })
      }
    }
    await touchCart(cartId, tx)
  })

  const view = await loadCartView(cartId)
  res.json({ cart: { id: cartId.toString(), ...view } })
}
