'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import { fetchRoute, type LatLng, type RouteResult } from '@/lib/delivery'

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs" style={{ minHeight: 320 }}>
      …
    </div>
  ),
})

// =====================================================================
// API types
// =====================================================================

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'delivering' | 'completed' | 'cancelled'
type PaymentMethod = 'cash_on_delivery' | 'paypal' | 'bank_qr_image'

interface OrderItem {
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
  recipient?:   string
  phone?:       string
  line?:        string
  ward?:        string | null
  district?:    string | null
  city?:        string
  country?:     string
  postal_code?: string | null
  lat?:         number | null
  lng?:         number | null
  note?:        string | null
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
  addressSnapshot:     AddressSnapshot
  subtotal:            number
  deliveryFee:         number
  distanceKm:          number | null
  durationMinutes:     number | null
  deliveryFeeBreakdown: DeliveryFeeBreakdown | null
  discount:            number
  total:               number
  currency:            string
  status:              OrderStatus
  paymentMethod:       PaymentMethod
  customerNote:        string | null
  scheduledAt:         string | null
  estimatedReadyAt:    string | null
  createdAt:           string
  updatedAt:           string
  items:               OrderItem[]
}

interface GetOrderResponse {
  order: OrderResp
}

// =====================================================================
// Constants
// =====================================================================

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'admin.status.pending_payment',
  paid:            'admin.status.paid',
  preparing:       'admin.status.preparing',
  delivering:      'admin.status.delivering',
  completed:       'admin.status.completed',
  cancelled:       'admin.status.cancelled',
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending_payment: 'bg-warning-50 text-warning-600',
  paid:            'bg-success-50 text-success-600',
  preparing:       'bg-brand-50 text-brand-500',
  delivering:      'bg-brand-50 text-brand-500',
  completed:       'bg-gray-100 text-gray-600',
  cancelled:       'bg-error-50 text-error-600',
}

// =====================================================================
// Page
// =====================================================================

export default function AdminOrderDetailPage() {
  const params = useParams<{ code: string }>()
  const code   = params.code
  const { t, locale } = useI18n()

  const [order,   setOrder]   = useState<OrderResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [route,   setRoute]   = useState<RouteResult | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const res = await api<GetOrderResponse>(`/orders/${encodeURIComponent(code)}`)
        if (!alive) return
        setOrder(res.order)
      } catch (e) {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [code])

  // Fetch route polyline khi đã có coords
  useEffect(() => {
    if (!order) return
    const storeLat = order.deliveryFeeBreakdown?.store_lat
    const storeLng = order.deliveryFeeBreakdown?.store_lng
    const destLat  = order.addressSnapshot.lat
    const destLng  = order.addressSnapshot.lng
    if (storeLat == null || storeLng == null || destLat == null || destLng == null) return

    const ctrl = new AbortController()
    fetchRoute(
      { lat: storeLat, lng: storeLng },
      { lat: destLat,  lng: destLng  },
      ctrl.signal,
    ).then(r => {
      if (!ctrl.signal.aborted) setRoute(r)
    })
    return () => ctrl.abort()
  }, [order])

  if (loading) {
    return (
      <div className="text-center text-gray-500 text-sm py-16">{t('order_detail.loading')}</div>
    )
  }
  if (error || !order) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-error-600 text-sm">{error ?? t('order_detail.not_found')}</p>
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 mt-4 text-sm text-brand-500 hover:text-brand-600">
          ← {t('admin.detail.back_to_list')}
        </Link>
      </div>
    )
  }

  const addr = order.addressSnapshot
  const created = new Date(order.createdAt)
  const createdStr = created.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const origin: LatLng | null =
    order.deliveryFeeBreakdown?.store_lat != null && order.deliveryFeeBreakdown?.store_lng != null
      ? { lat: order.deliveryFeeBreakdown.store_lat, lng: order.deliveryFeeBreakdown.store_lng }
      : null
  const destination: LatLng | null =
    addr.lat != null && addr.lng != null ? { lat: addr.lat, lng: addr.lng } : null

  return (
    <>
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/orders" className="hover:text-brand-600 transition-colors">
            ← {t('admin.detail.back_to_list')}
          </Link>
        }
        title={order.code}
        actions={
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${STATUS_BADGE[order.status]}`}>
            {t(STATUS_LABEL[order.status])}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT — 2 cols: items + address+map */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <Card title={t('admin.detail.items')}>
            <ul className="divide-y divide-gray-100">
              {order.items.map(it => (
                <li key={it.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  {it.dishImageUrl && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={it.dishImageUrl} alt={it.dishName} fill sizes="48px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{it.dishName}</div>
                    {it.options && it.options.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {it.options.map(o => o.label).join(' · ')}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
                      {formatEuro(it.unitPrice)} × {it.quantity}
                    </div>
                    {it.note && (
                      <div className="text-xs text-gray-400 italic mt-1">{it.note}</div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-800 whitespace-nowrap tabular-nums">
                    {formatEuro(it.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Delivery address + Map */}
          <Card title={t('admin.detail.delivery')}>
            <div className="space-y-3 mb-4">
              <Row label={t('admin.detail.recipient')} value={addr.recipient ?? '—'} />
              <Row label={t('admin.detail.phone')}     value={addr.phone ?? '—'} />
              <Row
                label={t('admin.detail.address')}
                value={
                  [
                    [addr.line, addr.ward].filter(Boolean).join(', '),
                    [addr.postal_code, addr.city, addr.country].filter(Boolean).join(' '),
                  ].filter(Boolean).join(' · ')
                }
              />
              {addr.note && <Row label={t('admin.detail.address_note')} value={addr.note} italic />}
            </div>

            {/* Map */}
            {origin && destination ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <div style={{ height: 320 }}>
                  <CheckoutMap
                    origin={{ lat: origin.lat, lng: origin.lng, name: 'Store' }}
                    destination={destination}
                    routeGeometry={route?.geometry ?? null}
                  />
                </div>
                <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-xs border border-gray-200 shadow-sm">
                  {order.distanceKm != null && (
                    <>
                      <span className="font-medium text-brand-500 tabular-nums">
                        {order.distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km
                      </span>
                      {order.durationMinutes != null && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-600 tabular-nums">
                            {Math.round(order.durationMinutes)} {t('admin.detail.min')}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {origin && destination && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-xs text-brand-500 hover:text-brand-600 border border-gray-200 shadow-sm transition-colors"
                  >
                    {t('order_detail.route.verify')} ↗
                  </a>
                )}
                <MapLegend t={t} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 py-10 text-center text-sm text-gray-400">
                {t('admin.detail.no_map_coords')}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — 1 col: customer + pricing + payment + metadata */}
        <div className="space-y-4">
          {/* Customer contact */}
          <Card title={t('admin.detail.customer')}>
            <div className="space-y-3">
              <Row label={t('admin.detail.name')}  value={order.contactName} />
              <Row label={t('admin.detail.email')} value={order.contactEmail} mono />
              <Row label={t('admin.detail.phone')} value={order.contactPhone} />
              {order.userId == null && (
                <div className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-100 inline-block px-1.5 py-0.5 rounded">
                  {t('admin.orders.guest_badge')}
                </div>
              )}
            </div>
          </Card>

          {/* Pricing */}
          <Card title={t('admin.detail.pricing')}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('admin.detail.subtotal')}</span>
                <span className="text-gray-800 tabular-nums">{formatEuro(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('admin.detail.shipping')}</span>
                <span className="text-gray-800 tabular-nums">{formatEuro(order.deliveryFee)}</span>
              </div>
              {order.distanceKm != null && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{t('admin.detail.distance')}</span>
                  <span className="tabular-nums">
                    {order.distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>{t('admin.detail.discount')}</span>
                  <span className="text-success-600 tabular-nums">−{formatEuro(order.discount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2 mt-2 border-t border-gray-100">
                <span className="text-base font-semibold text-gray-800">{t('admin.detail.total')}</span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">{formatEuro(order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card title={t('admin.detail.payment')}>
            <div className="space-y-3">
              <Row label={t('admin.detail.method')} value={paymentLabel(order.paymentMethod)} />
              <Row
                label={t('admin.detail.placed_at')}
                value={createdStr}
                mono
              />
              {order.scheduledAt && (
                <Row
                  label={t('admin.detail.scheduled_at')}
                  value={new Date(order.scheduledAt).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB')}
                  mono
                />
              )}
            </div>
          </Card>

          {/* Customer note */}
          {order.customerNote && (
            <Card title={t('admin.detail.customer_note')}>
              <p className="text-sm text-gray-600 whitespace-pre-wrap" style={{ lineHeight: 1.6 }}>
                {order.customerNote}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

// =====================================================================
// Helpers
// =====================================================================

/** Legend chú thích màu pin trên map — terracotta = store, near-black = destination */
function MapLegend({ t }: { t: (k: string) => string }) {
  return (
    <div className="absolute bottom-3 left-3 inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white text-[11px] border border-gray-200 shadow-sm">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c96442' }} />
        <span className="text-gray-700">{t('admin.detail.legend.store')}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#141413' }} />
        <span className="text-gray-700">{t('admin.detail.legend.destination')}</span>
      </span>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <h3 className="px-5 py-3.5 text-sm font-semibold text-gray-800 border-b border-gray-100">{title}</h3>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Row({ label, value, mono, italic }: { label: string; value: string; mono?: boolean; italic?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''} ${italic ? 'italic text-gray-600' : ''}`} style={{ lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  )
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}

function paymentLabel(m: PaymentMethod): string {
  switch (m) {
    case 'bank_qr_image':    return 'Bank QR'
    case 'paypal':           return 'PayPal'
    case 'cash_on_delivery': return 'Cash on delivery'
  }
}
