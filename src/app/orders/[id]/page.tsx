'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import { readOrderToken, saveOrderToken } from '@/lib/guestToken'
import { readLookupToken } from '@/lib/lookupToken'

// =====================================================================
// API types
// =====================================================================

interface OrderItemResp {
  id:           string
  dishId:       string
  dishName:     string
  dishImageUrl: string | null
  unitPrice:    number
  quantity:     number
  options:      Array<{ option_id: string; value_id: string; label: string; price_delta: number }> | null
  lineTotal:    number
  note:         string | null
}

interface AddressSnapshot {
  recipient:   string
  phone:       string
  line:        string
  city:        string
  country:     string
  postal_code: string | null
  ward?:       string | null
  district?:   string | null
  note?:       string | null
}

interface DeliveryFeeBreakdown {
  distance_km?:        number
  duration_minutes?:   number
  per_km?:             number
  base_fee?:           number
  threshold?:          number | null
  free_ship_applied?:  boolean
  radius_km?:          number
  store_lat?:          number
  store_lng?:          number
  provider?:           string
  alternatives_count?: number
  selection_strategy?: string
}

interface OrderResp {
  id:                  string
  code:                string
  userId:              string | null
  contactName:         string
  contactEmail:        string
  contactPhone:        string
  addressSnapshot:     AddressSnapshot & { lat?: number | null; lng?: number | null }
  subtotal:            number
  deliveryFee:         number
  distanceKm:          number | null
  durationMinutes:     number | null
  deliveryFeeBreakdown: DeliveryFeeBreakdown | null
  discount:            number
  total:               number
  currency:            string
  status:              'pending_payment' | 'paid' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
  paymentMethod:       'cash_on_delivery' | 'paypal' | 'bank_qr_image'
  customerNote:        string | null
  scheduledAt:         string | null
  estimatedReadyAt:    string | null
  createdAt:           string
  updatedAt:           string
  items:               OrderItemResp[]
}

interface BankInstr {
  method:          'bank_qr_image'
  amount:          number
  reference:       string
  bankQrImageUrl:  string | null
  bankAccountName: string | null
  bankAccountNo:   string | null
  bankName:        string | null
}
interface PaypalInstr {
  method:       'paypal'
  amount:       number
  reference:    string
  paypalEmail:  string | null
  paypalMeLink: string | null
}
interface CashInstr { method: 'cash_on_delivery'; amount: number; reference: string }
type PaymentInstructions = BankInstr | PaypalInstr | CashInstr

interface GetOrderResponse {
  order: OrderResp
  paymentInstructions?: PaymentInstructions
}

const STATUS_LABEL: Record<OrderResp['status'], string> = {
  pending_payment: 'admin.status.pending_payment',
  paid:            'admin.status.paid',
  preparing:       'admin.status.preparing',
  delivering:      'admin.status.delivering',
  completed:       'admin.status.completed',
  cancelled:       'admin.status.cancelled',
}

const STATUS_DOT: Record<OrderResp['status'], string> = {
  pending_payment: '#c96442',
  paid:            '#c96442',
  preparing:       '#c96442',
  delivering:      '#c96442',
  completed:       '#5e5d59',
  cancelled:       '#b53333',
}

const formatPrice = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export default function OrderDetailPage() {
  const params       = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { t, locale, formatDate } = useI18n()

  const code = params.id

  const [data,    setData]    = useState<GetOrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Lấy guest token: ưu tiên ?token=..., fallback localStorage[orderCode]
  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const urlToken = searchParams.get('token') ?? undefined
        const lsToken  = !urlToken ? readOrderToken(code) ?? undefined : undefined
        const guest    = urlToken || lsToken
        const lookup   = readLookupToken() ?? undefined

        // Nếu URL có token mà LS chưa có → persist cho lần sau
        if (urlToken) saveOrderToken(code, urlToken)

        const res = await api<GetOrderResponse>(`/orders/${encodeURIComponent(code)}`, {
          guestToken:  guest,
          lookupToken: lookup,
          locale,
        })
        setData(res)
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 404)         setError(t('order_detail.not_found'))
          else if (e.status === 403)    setError(t('order_detail.no_access'))
          else                          setError(e.message)
        } else {
          setError(t('checkout.error.generic'))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [code, searchParams, locale, t])

  if (loading) {
    return (
      <>
        <Header />
        <main className="menu-page-bg min-h-screen pt-32 pb-24 text-center text-[#87867f]">
          {t('order_detail.loading')}
        </main>
        <Footer />
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <main className="menu-page-bg min-h-screen pt-32 pb-24">
          <div className="max-w-xl mx-auto px-5 sm:px-6 text-center">
            <div
              className="rounded-2xl bg-[#faf9f5] py-16 px-6"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
              <h1
                className="font-display text-[#141413] text-[22px] font-medium"
                style={{ lineHeight: 1.2 }}
              >
                {error ?? t('order_detail.not_found')}
              </h1>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-6 bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
              >
                {t('checkout.empty.cta')} →
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { order, paymentInstructions } = data
  const addr = order.addressSnapshot

  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#5e5d59] hover:text-[#141413] mb-6 transition-colors"
          >
            ← {t('order.back')}
          </Link>

          {/* Header */}
          <div
            className="rounded-2xl bg-[#faf9f5] mb-4 overflow-hidden px-6 py-5"
            style={{ boxShadow: '0 0 0 1px #f0eee6' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-[10px] uppercase text-[#87867f] font-medium" style={{ letterSpacing: '0.5px' }}>
                    {t('order.code_label')}
                  </span>
                  <span className="font-display text-[#141413] text-[20px] sm:text-[22px] font-medium">
                    {order.code}
                  </span>
                </div>
                <div className="text-[13px] text-[#87867f] mt-1">
                  {t('order.placed_at')} · {formatDate(order.createdAt)}
                </div>
              </div>
              <span className="text-[13px] text-[#5e5d59] flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: STATUS_DOT[order.status] }}
                />
                {t(STATUS_LABEL[order.status] as Parameters<typeof t>[0])}
              </span>
            </div>
          </div>

          {/* Payment instructions */}
          {paymentInstructions && order.status === 'pending_payment' && (
            <PaymentBlock instr={paymentInstructions} />
          )}

          {/* Items */}
          <div
            className="rounded-2xl bg-[#faf9f5] p-6 mb-4"
            style={{ boxShadow: '0 0 0 1px #f0eee6' }}
          >
            <h2 className="font-display text-[#141413] text-[20px] font-medium mb-5" style={{ lineHeight: 1.2 }}>
              {t('order.items_title')}
            </h2>
            <div>
              {order.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  style={idx > 0 ? { borderTop: '1px solid #f0eee6' } : undefined}
                >
                  {item.dishImageUrl && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#e8e6dc] flex-shrink-0">
                      <Image src={item.dishImageUrl} alt={item.dishName} fill sizes="56px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[#141413] text-[16px] font-medium leading-tight">
                      {item.dishName}
                    </div>
                    {item.options && item.options.length > 0 && (
                      <div className="text-[12px] text-[#87867f] mt-0.5">
                        {item.options.map(o => o.label).join(' · ')}
                      </div>
                    )}
                    <div className="text-[13px] text-[#87867f] mt-1">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </div>
                    {item.note && (
                      <div className="text-[12px] text-[#87867f] mt-1 italic">{item.note}</div>
                    )}
                  </div>
                  <div className="font-display text-[#141413] text-[16px] font-medium whitespace-nowrap">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-5 space-y-2 text-[14px]" style={{ borderTop: '1px solid #f0eee6' }}>
              <div className="flex justify-between text-[#5e5d59]">
                <span>{t('order.subtotal')}</span>
                <span className="text-[#141413]">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5e5d59]">
                <span>{t('order.shipping_fee')}</span>
                <span className="text-[#141413]">{formatPrice(order.deliveryFee)}</span>
              </div>
              {order.distanceKm != null && (
                <div className="flex justify-between text-[#87867f] text-[12px]">
                  <span>{t('checkout.summary.distance')}</span>
                  <span>
                    {order.distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km
                  </span>
                </div>
              )}
              <div
                className="flex items-baseline justify-between pt-3 mt-3"
                style={{ borderTop: '1px solid #f0eee6' }}
              >
                <span className="font-display text-[#141413] text-[16px] font-medium">
                  {t('order.total')}
                </span>
                <span className="font-display text-[#141413] text-[22px] font-medium">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery route (transparency E) */}
          {order.distanceKm != null && (
            <RouteBlock
              distanceKm={order.distanceKm}
              durationMinutes={order.durationMinutes}
              storeLat={order.deliveryFeeBreakdown?.store_lat ?? null}
              storeLng={order.deliveryFeeBreakdown?.store_lng ?? null}
              destLat={order.addressSnapshot.lat ?? null}
              destLng={order.addressSnapshot.lng ?? null}
            />
          )}

          {/* Customer + payment summary */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#faf9f5] p-6" style={{ boxShadow: '0 0 0 1px #f0eee6' }}>
              <h2 className="font-display text-[#141413] text-[16px] font-medium mb-4" style={{ lineHeight: 1.2 }}>
                {t('order.shipping_info')}
              </h2>
              <dl className="space-y-3.5 text-[14px]">
                <Item label={t('order.recipient')} value={order.contactName} />
                <Item label={t('order.phone')}     value={order.contactPhone} />
                <Item
                  label={t('order.address')}
                  value={[addr.line, [addr.postal_code, addr.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                />
                {order.customerNote && <Item label={t('order.note')} value={order.customerNote} italic />}
              </dl>
            </div>

            <div className="rounded-2xl bg-[#faf9f5] p-6" style={{ boxShadow: '0 0 0 1px #f0eee6' }}>
              <h2 className="font-display text-[#141413] text-[16px] font-medium mb-4" style={{ lineHeight: 1.2 }}>
                {t('order.payment')}
              </h2>
              <div className="text-[14px]">
                <div className="text-[10px] uppercase text-[#87867f] font-medium" style={{ letterSpacing: '0.5px' }}>
                  {t('order.payment_method')}
                </div>
                <div className="text-[#141413] mt-0.5">
                  {order.paymentMethod === 'bank_qr_image' && t('checkout.payment.bank')}
                  {order.paymentMethod === 'paypal'        && t('checkout.payment.paypal')}
                  {order.paymentMethod === 'cash_on_delivery' && t('checkout.payment.cash')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

// =====================================================================
// Subcomponents
// =====================================================================

function RouteBlock({
  distanceKm, durationMinutes, storeLat, storeLng, destLat, destLng,
}: {
  distanceKm:      number
  durationMinutes: number | null
  storeLat:        number | null
  storeLng:        number | null
  destLat:         number | null
  destLng:         number | null
}) {
  const { t, locale } = useI18n()
  const km = distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')
  const minutes = durationMinutes != null ? Math.round(durationMinutes) : null

  // Google Maps directions URL — chỉ build khi có đủ 4 coords để khách self-verify
  const gmapUrl =
    storeLat != null && storeLng != null && destLat != null && destLng != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${destLat},${destLng}&travelmode=driving`
      : null

  return (
    <div
      className="rounded-2xl bg-[#faf9f5] p-5 sm:p-6 mb-4"
      style={{ boxShadow: '0 0 0 1px #f0eee6' }}
    >
      <h2 className="font-display text-[#141413] text-[16px] font-medium mb-2" style={{ lineHeight: 1.2 }}>
        {t('order_detail.route.title')}
      </h2>
      <div className="text-[13px] text-[#5e5d59]" style={{ lineHeight: 1.5 }}>
        {t('order_detail.route.via')
          .replace('{{km}}',      km)
          .replace('{{minutes}}', minutes != null ? String(minutes) : '—')}
      </div>
      {gmapUrl && (
        <a
          href={gmapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-[#c96442] hover:text-[#d97757] transition-colors"
        >
          {t('order_detail.route.verify')} ↗
        </a>
      )}
    </div>
  )
}

function PaymentBlock({ instr }: { instr: PaymentInstructions }) {
  const { t } = useI18n()

  if (instr.method === 'bank_qr_image') {
    return (
      <div
        className="rounded-2xl bg-[#faf9f5] p-6 mb-4"
        style={{ boxShadow: '0 0 0 1px #f0eee6' }}
      >
        <div className="text-[10px] uppercase tracking-wide text-[#c96442] mb-2 font-medium">
          {t('order_detail.payment.title')}
        </div>
        <h2 className="font-display text-[#141413] text-[20px] font-medium mb-3" style={{ lineHeight: 1.2 }}>
          {t('order_detail.payment.bank.title')}
        </h2>
        <p className="text-[13px] text-[#5e5d59] mb-4" style={{ lineHeight: 1.5 }}>
          {t('order_detail.payment.bank.scan')}
        </p>

        <div className="grid sm:grid-cols-[200px_1fr] gap-5 items-start">
          {instr.bankQrImageUrl && (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#e8e6dc]">
              <Image
                src={instr.bankQrImageUrl}
                alt="Bank QR"
                fill
                sizes="200px"
                className="object-contain p-2"
              />
            </div>
          )}
          <dl className="space-y-2.5 text-[13px]">
            {instr.bankAccountName && (
              <Item label={t('order_detail.payment.recipient')} value={instr.bankAccountName} />
            )}
            {instr.bankAccountNo && (
              <Item label={t('order_detail.payment.iban')} value={instr.bankAccountNo} mono />
            )}
            {instr.bankName && (
              <Item label={t('order_detail.payment.bank_name')} value={instr.bankName} />
            )}
            <Item label={t('order_detail.payment.reference')} value={instr.reference} mono accent />
            <Item label={t('order_detail.payment.amount')}    value={`${instr.amount.toFixed(2).replace('.', ',')} €`} accent />
          </dl>
        </div>
      </div>
    )
  }

  if (instr.method === 'paypal') {
    return (
      <div
        className="rounded-2xl bg-[#faf9f5] p-6 mb-4"
        style={{ boxShadow: '0 0 0 1px #f0eee6' }}
      >
        <div className="text-[10px] uppercase tracking-wide text-[#c96442] mb-2 font-medium">
          {t('order_detail.payment.title')}
        </div>
        <h2 className="font-display text-[#141413] text-[20px] font-medium mb-3" style={{ lineHeight: 1.2 }}>
          {t('order_detail.payment.paypal.title')}
        </h2>
        <dl className="space-y-2.5 text-[13px]">
          {instr.paypalEmail && (
            <Item label={t('order_detail.payment.paypal.send_to')} value={instr.paypalEmail} mono accent />
          )}
          <Item label={t('order_detail.payment.reference')} value={instr.reference} mono />
          <Item label={t('order_detail.payment.amount')}    value={`${instr.amount.toFixed(2).replace('.', ',')} €`} accent />
        </dl>
        {instr.paypalMeLink && (
          <a
            href={instr.paypalMeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-4 py-2 rounded-xl transition-colors"
          >
            {t('order_detail.payment.paypal.link')} ↗
          </a>
        )}
      </div>
    )
  }

  // cash_on_delivery
  return (
    <div
      className="rounded-2xl bg-[#faf9f5] p-6 mb-4"
      style={{ boxShadow: '0 0 0 1px #f0eee6' }}
    >
      <div className="text-[10px] uppercase tracking-wide text-[#c96442] mb-2 font-medium">
        {t('order_detail.payment.title')}
      </div>
      <h2 className="font-display text-[#141413] text-[20px] font-medium mb-2" style={{ lineHeight: 1.2 }}>
        {t('order_detail.payment.cash.title')}
      </h2>
      <p className="text-[13px] text-[#5e5d59]">{t('order_detail.payment.cash.body')}</p>
    </div>
  )
}

function Item({
  label, value, italic, mono, accent,
}: { label: string; value: string; italic?: boolean; mono?: boolean; accent?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-[#87867f] font-medium" style={{ letterSpacing: '0.5px' }}>
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${italic ? 'text-[#5e5d59] italic' : accent ? 'text-[#c96442] font-medium' : 'text-[#141413]'} ${mono ? 'font-mono' : ''}`}
        style={{ lineHeight: 1.5 }}
      >
        {value}
      </dd>
    </div>
  )
}
