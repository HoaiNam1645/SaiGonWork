'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// API types — khớp với shapeOrder() ở backend
// =====================================================================

type ApiStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'

interface ApiOrderItem {
  id:           string
  dishName:     string
  dishImageUrl: string | null
  quantity:     number
}

interface ApiOrder {
  id:            string
  code:          string
  status:        ApiStatus
  total:         number
  currency:      string
  paymentMethod: 'cash_on_delivery' | 'paypal' | 'bank_qr_image'
  createdAt:     string
  items:         ApiOrderItem[]
}

interface ListResponse { orders: ApiOrder[] }

type TabKey = 'placed' | 'shipping' | 'delivered' | 'cancelled'

const TABS: { key: TabKey; labelKey: TKey; statuses: ApiStatus[] }[] = [
  { key: 'placed',    labelKey: 'orders.tab.placed',    statuses: ['pending_payment', 'paid'] },
  { key: 'shipping',  labelKey: 'orders.tab.shipping',  statuses: ['preparing', 'delivering'] },
  { key: 'delivered', labelKey: 'orders.tab.delivered', statuses: ['completed'] },
  { key: 'cancelled', labelKey: 'orders.tab.cancelled', statuses: ['cancelled'] },
]

const STATUS_LABEL: Record<ApiStatus, TKey> = {
  pending_payment: 'admin.status.pending_payment',
  paid:            'admin.status.paid',
  preparing:       'admin.status.preparing',
  delivering:      'admin.status.delivering',
  completed:       'admin.status.completed',
  cancelled:       'admin.status.cancelled',
}

const PAYMENT_SHORT: Record<ApiOrder['paymentMethod'], string> = {
  cash_on_delivery: 'Cash',
  paypal:           'PayPal',
  bank_qr_image:    'Bank QR',
}

// =====================================================================
// Page
// =====================================================================

export default function OrdersPage() {
  const { t, formatDate, locale } = useI18n()
  const [active, setActive]   = useState<TabKey>('placed')
  const [orders, setOrders]   = useState<ApiOrder[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const res = await api<ListResponse>('/orders', { locale })
        if (!alive) return
        setOrders(res.orders)
      } catch (e) {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'Failed to load orders')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [locale])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { placed: 0, shipping: 0, delivered: 0, cancelled: 0 }
    if (!orders) return c
    for (const tab of TABS) {
      c[tab.key] = orders.filter(o => tab.statuses.includes(o.status)).length
    }
    return c
  }, [orders])

  const visible: ApiOrder[] = useMemo(() => {
    if (!orders) return []
    const tab = TABS.find(t => t.key === active)!
    return orders.filter(o => tab.statuses.includes(o.status))
  }, [orders, active])

  const fmtPrice = useMemo(
    () => new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency', currency: 'EUR',
    }),
    [locale],
  )

  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          {/* Page header */}
          <div className="mb-10">
            <div
              className="text-[10px] uppercase text-[#87867f] mb-3"
              style={{ letterSpacing: '0.5px' }}
            >
              {t('orders.eyebrow')}
            </div>
            <h1
              className="font-display text-[#141413] text-[40px] sm:text-[52px] font-medium"
              style={{ lineHeight: 1.1 }}
            >
              {t('orders.title')}
            </h1>
            <p
              className="text-[#5e5d59] text-[17px] mt-3 max-w-xl"
              style={{ lineHeight: 1.6 }}
            >
              {t('orders.subtitle')}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div
              className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-[#faf9f5]"
              style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
            >
              {TABS.map((tab) => {
                const isActive = tab.key === active
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActive(tab.key)}
                    className={`px-4 py-1.5 text-[14px] rounded-lg whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-[#141413] text-[#faf9f5] font-medium'
                        : 'text-[#4d4c48] hover:bg-[#e8e6dc]/60'
                    }`}
                  >
                    <span>{t(tab.labelKey)}</span>
                    {counts[tab.key] > 0 && (
                      <span
                        className={`ml-2 text-[12px] ${
                          isActive ? 'text-[#b0aea5]' : 'text-[#87867f]'
                        }`}
                      >
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-[#87867f] text-sm py-20">…</div>
            ) : error ? (
              <div className="text-center text-[#b53333] text-sm py-20">{error}</div>
            ) : visible.length === 0 ? (
              <div
                className="rounded-2xl bg-[#faf9f5] py-20 text-center"
                style={{ boxShadow: '0 0 0 1px #f0eee6' }}
              >
                <div className="font-display text-[#141413] text-[20px] font-medium">
                  {t('orders.empty.title')}
                </div>
                <div className="text-[#87867f] text-[14px] mt-1">
                  {t('orders.empty.body')}
                </div>
              </div>
            ) : (
              visible.map((order) => {
                const totalQty = order.items.reduce((s, i) => s + i.quantity, 0)
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${encodeURIComponent(order.code)}`}
                    className="group block rounded-2xl bg-[#faf9f5] p-5 transition-all"
                    style={{ boxShadow: '0 0 0 1px #f0eee6' }}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
                        <span
                          className="text-[10px] uppercase text-[#87867f] font-medium"
                          style={{ letterSpacing: '0.5px' }}
                        >
                          {t('orders.code')}
                        </span>
                        <span className="font-display text-[#141413] text-[17px] font-medium">
                          #{order.code}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#87867f] flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            order.status === 'cancelled'
                              ? 'bg-[#b53333]'
                              : order.status === 'completed'
                              ? 'bg-[#5e5d59]'
                              : 'bg-[#c96442]'
                          }`}
                        />
                        {t(STATUS_LABEL[order.status])}
                      </span>
                    </div>

                    <div className="text-[13px] text-[#87867f] mb-4">
                      {formatDate(order.createdAt)}
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 4).map((item, idx) =>
                          item.dishImageUrl ? (
                            <div
                              key={idx}
                              className="relative w-9 h-9 rounded-full overflow-hidden bg-[#e8e6dc]"
                              style={{ boxShadow: '0 0 0 2px #faf9f5' }}
                            >
                              <Image
                                src={item.dishImageUrl}
                                alt={item.dishName}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                          ) : null,
                        )}
                      </div>
                      <div className="text-[14px] text-[#5e5d59] ml-1.5 line-clamp-1 flex-1 min-w-0">
                        {order.items.map(i => i.dishName).join(' · ')}
                      </div>
                    </div>

                    <div
                      className="flex items-baseline justify-between pt-4"
                      style={{ borderTop: '1px solid #f0eee6' }}
                    >
                      <div className="text-[13px] text-[#87867f]">
                        {totalQty} {t('orders.items_count')} · {PAYMENT_SHORT[order.paymentMethod]}
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-[#141413] text-[18px] font-medium">
                          {fmtPrice.format(order.total)}
                        </span>
                        <span className="text-[14px] text-[#c96442] group-hover:text-[#d97757] transition-colors">
                          {t('orders.detail')} →
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
