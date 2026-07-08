import type { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BadRequest, NotFound } from '@/lib/errors'
import { logAuditAsync } from '@/lib/auditLog'
import { clientIp } from '@/lib/request'

// =====================================================================
// Store settings — singleton row id=1. Admin đọc/sửa toàn bộ cấu hình:
// thông tin cửa hàng, giờ mở, cấu hình giao hàng, phương thức thanh toán.
// GET công khai (/api/store) chỉ trả subset — đây là view đầy đủ cho admin.
// =====================================================================

const STORE_ID = 1

function num(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null
  return Number(v)
}

// ---- openHours: { mon: ['11:00','22:00'] | null, ... } cho đủ 7 ngày ----
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = (typeof DAYS)[number]
type OpenHours = Record<Day, [string, string] | null>

const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'validation.time_invalid')
const dayHours = z.union([z.null(), z.tuple([timeStr, timeStr])])
const openHoursSchema = z.object({
  mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours,
  fri: dayHours, sat: dayHours, sun: dayHours,
})

/** Parse openHoursJson từ DB (Json) → shape chuẩn cho FE. Bỏ qua giá trị lạ. */
function shapeOpenHours(raw: unknown): OpenHours {
  const out = {} as OpenHours
  const src = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {}
  for (const d of DAYS) {
    const v = src[d]
    out[d] = Array.isArray(v) && v.length === 2 &&
      typeof v[0] === 'string' && typeof v[1] === 'string'
        ? [v[0], v[1]]
        : null
  }
  return out
}

// ---- nullable helpers ----
const nullableEmail = z.string().trim().email('validation.email_invalid').max(150).nullable()
const nullableStr = (max: number) => z.string().trim().max(max).nullable()

// ---- update schema (PUT) — mọi field optional, chỉ ghi field được gửi ----
const updateSchema = z.object({
  name:          z.string().trim().min(1, 'validation.required').max(150).optional(),
  hotline:       nullableStr(20).optional(),
  email:         nullableEmail.optional(),
  address:       nullableStr(255).optional(),
  lat:           z.number().min(-90).max(90).nullable().optional(),
  lng:           z.number().min(-180).max(180).nullable().optional(),
  isOpen:        z.boolean().optional(),
  closedMessage: nullableStr(255).optional(),
  currency:      z.string().trim().length(3).toUpperCase().optional(),
  openHours:     openHoursSchema.optional(),
  delivery: z.object({
    radiusKm:           z.number().min(0).max(999).optional(),
    baseFee:            z.number().min(0).max(100_000).optional(),
    perKm:              z.number().min(0).max(100_000).optional(),
    freeShipThreshold:  z.number().min(0).max(100_000).nullable().optional(),
    kitchenPrepMinutes: z.number().int().min(0).max(600).optional(),
  }).optional(),
  payment: z.object({
    paypalEmail:     nullableEmail.optional(),
    paypalMeLink:    nullableStr(255).optional(),
    bankQrImageUrl:  nullableStr(500).optional(),
    bankAccountName: nullableStr(100).optional(),
    bankAccountNo:   nullableStr(50).optional(),
    bankName:        nullableStr(100).optional(),
  }).optional(),
}).refine(
  d => Object.keys(d).length > 0,
  { message: 'validation.required' },
)

interface StoreRow {
  name:               string
  hotline:            string | null
  email:              string | null
  address:            string | null
  lat:                Prisma.Decimal | null
  lng:                Prisma.Decimal | null
  openHoursJson:      unknown
  isOpen:             boolean
  closedMessage:      string | null
  paypalEmail:        string | null
  paypalMeLink:       string | null
  bankQrImageUrl:     string | null
  bankAccountName:    string | null
  bankAccountNo:      string | null
  bankName:           string | null
  deliveryRadiusKm:   Prisma.Decimal
  deliveryBaseFee:    Prisma.Decimal
  deliveryPerKm:      Prisma.Decimal
  freeShipThreshold:  Prisma.Decimal | null
  kitchenPrepMinutes: number
  routingProvider:    string
  defaultCurrency:    string
  updatedAt:          Date
}

function shape(s: StoreRow) {
  return {
    name:          s.name,
    hotline:       s.hotline,
    email:         s.email,
    address:       s.address,
    lat:           num(s.lat),
    lng:           num(s.lng),
    isOpen:        s.isOpen,
    closedMessage: s.closedMessage,
    currency:      s.defaultCurrency,
    openHours:     shapeOpenHours(s.openHoursJson),
    delivery: {
      radiusKm:           num(s.deliveryRadiusKm),
      baseFee:            num(s.deliveryBaseFee),
      perKm:              num(s.deliveryPerKm),
      freeShipThreshold:  num(s.freeShipThreshold),
      kitchenPrepMinutes: s.kitchenPrepMinutes,
      routingProvider:    s.routingProvider,
    },
    payment: {
      paypalEmail:     s.paypalEmail,
      paypalMeLink:    s.paypalMeLink,
      bankQrImageUrl:  s.bankQrImageUrl,
      bankAccountName: s.bankAccountName,
      bankAccountNo:   s.bankAccountNo,
      bankName:        s.bankName,
    },
    updatedAt: s.updatedAt,
  }
}

// =====================================================================
// GET /api/admin/store
// =====================================================================

export async function get(_req: Request, res: Response) {
  const s = await prisma.storeSettings.findUnique({ where: { id: STORE_ID } })
  if (!s) throw NotFound('common.not_found')
  res.json({ store: shape(s) })
}

// =====================================================================
// PUT /api/admin/store
// =====================================================================

export async function update(req: Request, res: Response) {
  const body = updateSchema.parse(req.body)

  const existing = await prisma.storeSettings.findUnique({ where: { id: STORE_ID } })
  if (!existing) throw NotFound('common.not_found')

  const data: Prisma.StoreSettingsUpdateInput = {}

  // --- store info ---
  if (body.name          !== undefined) data.name          = body.name
  if (body.hotline       !== undefined) data.hotline       = body.hotline
  if (body.email         !== undefined) data.email         = body.email
  if (body.address       !== undefined) data.address       = body.address
  if (body.lat           !== undefined) data.lat           = body.lat != null ? new Prisma.Decimal(body.lat) : null
  if (body.lng           !== undefined) data.lng           = body.lng != null ? new Prisma.Decimal(body.lng) : null
  if (body.isOpen        !== undefined) data.isOpen        = body.isOpen
  if (body.closedMessage !== undefined) data.closedMessage = body.closedMessage
  if (body.currency      !== undefined) data.defaultCurrency = body.currency

  // --- open hours ---
  if (body.openHours !== undefined) {
    data.openHoursJson = body.openHours as Prisma.InputJsonValue
  }

  // --- delivery ---
  if (body.delivery) {
    const d = body.delivery
    if (d.radiusKm           !== undefined) data.deliveryRadiusKm   = new Prisma.Decimal(d.radiusKm)
    if (d.baseFee            !== undefined) data.deliveryBaseFee     = new Prisma.Decimal(d.baseFee)
    if (d.perKm              !== undefined) data.deliveryPerKm       = new Prisma.Decimal(d.perKm)
    if (d.freeShipThreshold  !== undefined) data.freeShipThreshold   = d.freeShipThreshold != null ? new Prisma.Decimal(d.freeShipThreshold) : null
    if (d.kitchenPrepMinutes !== undefined) data.kitchenPrepMinutes  = d.kitchenPrepMinutes
  }

  // --- payment ---
  if (body.payment) {
    const p = body.payment
    if (p.paypalEmail     !== undefined) data.paypalEmail     = p.paypalEmail
    if (p.paypalMeLink    !== undefined) data.paypalMeLink    = p.paypalMeLink
    if (p.bankQrImageUrl  !== undefined) data.bankQrImageUrl  = p.bankQrImageUrl
    if (p.bankAccountName !== undefined) data.bankAccountName = p.bankAccountName
    if (p.bankAccountNo   !== undefined) data.bankAccountNo   = p.bankAccountNo
    if (p.bankName        !== undefined) data.bankName        = p.bankName
  }

  if (Object.keys(data).length === 0) {
    throw BadRequest('validation.required', 'NO_FIELDS')
  }

  const updated = await prisma.storeSettings.update({ where: { id: STORE_ID }, data })

  logAuditAsync({
    action:     'admin.settings.update',
    entityType: 'store_settings',
    entityId:   STORE_ID,
    actorId:    BigInt(req.user!.sub),
    actorRole:  req.user!.role,
    diff:       { fields: sectionsTouched(body) },
    ipAddress:  clientIp(req),
  })

  res.json({ store: shape(updated) })
}

/** Liệt kê section/field đã đổi để ghi audit (không log giá trị nhạy cảm). */
function sectionsTouched(body: z.infer<typeof updateSchema>): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue
    if ((k === 'delivery' || k === 'payment') && v && typeof v === 'object') {
      for (const sub of Object.keys(v)) out.push(`${k}.${sub}`)
    } else {
      out.push(k)
    }
  }
  return out
}
