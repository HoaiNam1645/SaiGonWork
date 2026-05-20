'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import {
  readLookupToken,
  readLookupEmail,
  clearLookupSession,
} from '@/lib/lookupToken'

// =====================================================================
// Backend types — đơn giản hoá lại từ shapeOrder ở BE
// =====================================================================

type BackendStatus =
  | 'pending_payment' | 'paid' | 'preparing'
  | 'delivering' | 'completed' | 'cancelled'

interface BackendOrderItem {
  id:           string
  dishName:     string
  dishImageUrl: string | null
  quantity:     number
  lineTotal:    number
}

interface BackendOrder {
  id:            string
  code:          string
  status:        BackendStatus
  total:         number
  currency:      string
  paymentMethod: string
  createdAt:     string
  items:         BackendOrderItem[]
}

interface ListResponse { orders: BackendOrder[] }

// =====================================================================
// Tab → backend status mapping
// =====================================================================

type TabKey = 'placed' | 'shipping' | 'delivered' | 'cancelled'

const TABS: { key: TabKey; labelKey: TKey; statuses: BackendStatus[] }[] = [
  { key: 'placed',    labelKey: 'orders.tab.placed',    statuses: ['pending_payment', 'paid', 'preparing'] },
  { key: 'shipping',  labelKey: 'orders.tab.shipping',  statuses: ['delivering'] },
  { key: 'delivered', labelKey: 'orders.tab.delivered', statuses: ['completed'] },
  { key: 'cancelled', labelKey: 'orders.tab.cancelled', statuses: ['cancelled'] },
]

const STATUS_KEY: Record<BackendStatus, TKey> = {
  pending_payment: 'status.placed',
  paid:            'status.placed',
  preparing:       'status.preparing',
  delivering:      'status.shipping',
  completed:       'status.delivered',
  cancelled:       'status.cancelled',
}

const formatPrice = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export default function OrdersPage() {
  const { t, formatDate, locale } = useI18n()
  const { user } = useAuth()
  const router = useRouter()

  const [active, setActive] = useState<TabKey>('placed')
  const [orders, setOrders] = useState<BackendOrder[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load orders: customer → /orders, guest có lookup token → /orders/lookup,
  // không có gì → đẩy sang /orders/lookup để guest verify OTP.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (user) {
          const res = await api<ListResponse>('/orders', { locale })
          if (!cancelled) setOrders(res.orders)
          return
        }

        const lookupTok = readLookupToken()
        if (lookupTok) {
          try {
            const res = await api<ListResponse>('/orders/lookup', {
              lookupToken: lookupTok,
              locale,
            })
            if (!cancelled) setOrders(res.orders)
            return
          } catch (e) {
            if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
              clearLookupSession()
              router.replace('/orders/lookup')
              return
            }
            throw e
          }
        }

        // Chưa login + chưa có lookup session → bắt verify OTP
        router.replace('/orders/lookup')
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : t('checkout.error.generic'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user, locale, router, t])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { placed: 0, shipping: 0, delivered: 0, cancelled: 0 }
    if (!orders) return c
    for (const tab of TABS) {
      c[tab.key] = orders.filter((o) => tab.statuses.includes(o.status)).length
    }
    return c
  }, [orders])

  const visible: BackendOrder[] = useMemo(() => {
    if (!orders) return []
    const tab = TABS.find((t) => t.key === active)!
    return orders.filter((o) => tab.statuses.includes(o.status))
  }, [active, orders])

  const lookupEmail = !user ? readLookupEmail() : null

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

            {/* Guest lookup banner — cho phép sign out để dùng email khác */}
            {!user && lookupEmail && (
              <div className="mt-5 flex items-center justify-between gap-3 text-[13px] text-[#5e5d59]">
                <span className="truncate">
                  {t('lookup.signed_in_as').replace('{{email}}', lookupEmail)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearLookupSession()
                    router.replace('/orders/lookup')
                  }}
                  className="text-[#c96442] hover:text-[#d97757] transition-colors shrink-0"
                >
                  {t('lookup.use_different_email')}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div
              className="mb-6 rounded-xl px-3.5 py-2.5 text-[13px]"
              style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
            >
              {error}
            </div>
          )}

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
              <div
                className="rounded-2xl bg-[#faf9f5] py-20 text-center text-[#87867f] text-[14px]"
                style={{ boxShadow: '0 0 0 1px #f0eee6' }}
              >
                {t('order_detail.loading')}
              </div>
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
                        {t(STATUS_KEY[order.status])}
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
                        {order.items.map((i) => i.dishName).join(' · ')}
                      </div>
                    </div>

                    <div
                      className="flex items-baseline justify-between pt-4"
                      style={{ borderTop: '1px solid #f0eee6' }}
                    >
                      <div className="text-[13px] text-[#87867f]">
                        {totalQty} {t('orders.items_count')} · {order.paymentMethod}
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-[#141413] text-[18px] font-medium">
                          {formatPrice(order.total)}
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
