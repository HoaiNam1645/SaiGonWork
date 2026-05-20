'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import SortableHeader, { type SortDir } from '@/components/admin/ui/SortableHeader'
import Pagination from '@/components/admin/ui/Pagination'
import FilterInput from '@/components/admin/ui/FilterInput'
import Dropdown, { DropdownDivider, DropdownItem } from '@/components/admin/ui/Dropdown'
import EditOrderModalInner from '@/components/admin/orders/EditOrderModalInner'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { useStaffOrdersSocket, type OrderCreatedPayload, type OrderStatusChangedPayload } from '@/lib/socket'

// =====================================================================
// Types
// =====================================================================

type OrderStatus =
  | 'pending_payment' | 'paid' | 'preparing'
  | 'delivering'      | 'completed' | 'cancelled'

type PaymentMethod = 'cash_on_delivery' | 'paypal' | 'bank_qr_image'
type SortKey       = 'created' | 'total'
type AdminRole     = 'staff' | 'admin'

interface Filters {
  code:            string
  customerName:    string
  customerPhone:   string
  deliveryAddress: string
}

const EMPTY_FILTERS: Filters = {
  code:            '',
  customerName:    '',
  customerPhone:   '',
  deliveryAddress: '',
}

interface AddressLine {
  recipient?:   string | null
  phone?:       string | null
  line?:        string | null
  ward?:        string | null
  district?:    string | null
  city?:        string | null
  country?:     string | null
  postal_code?: string | null
  lat?:         number | null
  lng?:         number | null
  note?:        string | null
}

interface OrderItemLite {
  id:           string
  dishName:     string
  dishImageUrl: string | null
  unitPrice:    number
  quantity:     number
  lineTotal:    number
  options:      Array<{ option_id: string; value_id: string; label: string; price_delta: number }> | null
}

interface OrderRow {
  id:             string
  code:           string
  contactName:    string
  contactPhone:   string
  contactEmail:   string
  total:          number
  currency:       string
  status:         OrderStatus
  paymentMethod:  PaymentMethod
  bankTxId:       string | null
  itemCount:      number
  items:          OrderItemLite[]
  distanceKm:     number | null
  createdAt:      string
  isGuest:        boolean
  addressLine:    string | null
  addressFull:    AddressLine | null   // full snapshot cho edit modal
  customerNote:   string | null
  flashUntil?:    number
}

interface RestOrder {
  id:               string
  code:             string
  userId:           string | null
  contactName:      string
  contactPhone:     string
  contactEmail:     string
  total:            number
  currency:         string
  status:           OrderStatus
  paymentMethod:    PaymentMethod
  bankTxId:         string | null
  distanceKm:       number | null
  createdAt:        string
  customerNote:     string | null
  addressSnapshot:  AddressLine | null
  items:            OrderItemLite[]
}

interface AdminListResponse {
  orders: RestOrder[]
  total:  number
  limit:  number
  offset: number
}

interface OrderMutationResponse {
  order: RestOrder
}

// =====================================================================
// Constants
// =====================================================================

const PAGE_LIMIT        = 20
const FLASH_DURATION_MS = 20_000

const STATUS_FILTERS: Array<{ key: 'all' | OrderStatus; label: string }> = [
  { key: 'all',             label: 'admin.orders.filter.all' },
  { key: 'pending_payment', label: 'admin.orders.filter.pending' },
  { key: 'paid',            label: 'admin.orders.filter.paid' },
  { key: 'preparing',       label: 'admin.orders.filter.preparing' },
  { key: 'delivering',      label: 'admin.orders.filter.delivering' },
  { key: 'completed',       label: 'admin.orders.filter.completed' },
  { key: 'cancelled',       label: 'admin.orders.filter.cancelled' },
]

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

// State machine FE-side — mirror với BE để chỉ render valid transitions.
// Khi gọi API, BE re-validate lần nữa.
const TRANSITIONS: Record<OrderStatus, Array<{ to: OrderStatus; roles: AdminRole[] }>> = {
  pending_payment: [
    { to: 'paid',      roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['staff', 'admin'] },
  ],
  paid: [
    { to: 'preparing', roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['admin'] },
  ],
  preparing: [
    { to: 'delivering', roles: ['staff', 'admin'] },
    { to: 'cancelled',  roles: ['admin'] },
  ],
  delivering: [
    { to: 'completed', roles: ['staff', 'admin'] },
    { to: 'cancelled', roles: ['staff', 'admin'] },
  ],
  completed: [
    { to: 'cancelled', roles: ['admin'] },
  ],
  cancelled: [],
}

const TRANSITION_LABEL: Record<OrderStatus, string> = {
  pending_payment: '',  // không transition tới (legacy)
  paid:            'admin.orders.tr.to_paid',
  preparing:       'admin.orders.tr.to_preparing',
  delivering:      'admin.orders.tr.to_delivering',
  completed:       'admin.orders.tr.to_completed',
  cancelled:       'admin.orders.tr.to_cancelled',
}

function toApiSort(key: SortKey, dir: SortDir): string {
  return `${key}_${dir}`
}

function isAnyFilterActive(s: 'all' | OrderStatus, f: Filters): boolean {
  return s !== 'all' || !!f.code || !!f.customerName || !!f.customerPhone || !!f.deliveryAddress
}

// =====================================================================
// Page
// =====================================================================

export default function AdminOrdersPage() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const router = useRouter()
  const role: AdminRole = user?.role === 'admin' ? 'admin' : 'staff'

  // Filter state
  const [status,  setStatus]  = useState<'all' | OrderStatus>('all')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [offset,  setOffset]  = useState(0)

  // Data state
  const [orders,  setOrders]  = useState<OrderRow[] | null>(null)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [now,     setNow]     = useState(() => Date.now())

  // Modals state
  const [editing,        setEditing]        = useState<OrderRow | null>(null)
  const [cancelling,     setCancelling]     = useState<OrderRow | null>(null)

  // Overdue pending_payment cảnh báo — chỉ hiện lần đầu vào page mỗi session.
  const [overdue,     setOverdue]     = useState<OrderRow[] | null>(null)
  const [showOverdue, setShowOverdue] = useState(false)

  const filtersActive = isAnyFilterActive(status, filters)

  useEffect(() => { setOffset(0) }, [status, filters, sortKey, sortDir])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // ─── Fetch overdue pending_payment mỗi lần vào page ───
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api<{ orders: RestOrder[] }>('/orders/admin/overdue')
        if (!alive) return
        const rows = res.orders.map(restToRow)
        if (rows.length > 0) {
          setOverdue(rows)
          setShowOverdue(true)
        }
      } catch {
        /* swallow — cảnh báo nice-to-have, không chặn page */
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (status !== 'all')           params.set('status',          status)
        if (filters.code)               params.set('code',            filters.code)
        if (filters.customerName)       params.set('customerName',    filters.customerName)
        if (filters.customerPhone)      params.set('customerPhone',   filters.customerPhone)
        if (filters.deliveryAddress)    params.set('deliveryAddress', filters.deliveryAddress)
        params.set('sort',   toApiSort(sortKey, sortDir))
        params.set('limit',  String(PAGE_LIMIT))
        params.set('offset', String(offset))
        const res = await api<AdminListResponse>(`/orders/admin/list?${params.toString()}`)
        if (!alive) return
        setOrders(res.orders.map(restToRow))
        setTotal(res.total)
      } catch (e) {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [status, filters, sortKey, sortDir, offset])

  // ─── Helpers cập nhật row trong list sau mutation ───
  const replaceRow = useCallback((updated: RestOrder) => {
    setOrders(prev => {
      if (!prev) return prev
      const newRow = restToRow(updated)
      return prev.map(r => r.id === updated.id ? { ...r, ...newRow, flashUntil: r.flashUntil } : r)
    })
  }, [])

  // ─── Socket events ───
  const onCreated = useCallback((p: OrderCreatedPayload) => {
    setOrders(prev => {
      if (!prev) return prev
      if (offset > 0) return prev
      if (prev.some(o => o.id === p.id)) return prev
      if (status !== 'all' && p.status !== status) return prev
      const ci = (s: string) => s.toLowerCase()
      if (filters.code && !ci(p.code).includes(ci(filters.code))) return prev
      if (filters.customerName && !ci(p.contactName).includes(ci(filters.customerName))) return prev
      if (filters.customerPhone && !ci(p.contactPhone).includes(ci(filters.customerPhone))) return prev
      if (filters.deliveryAddress) return prev
      const row: OrderRow = {
        id:            p.id,
        code:          p.code,
        contactName:   p.contactName,
        contactPhone:  p.contactPhone,
        contactEmail:  p.contactEmail,
        total:         p.total,
        currency:      p.currency,
        status:        p.status,
        paymentMethod: p.paymentMethod,
        bankTxId:      p.bankTxId,
        itemCount:     p.itemCount,
        items:         p.items.map(i => ({
          id:           i.id,
          dishName:     i.dishName,
          dishImageUrl: i.dishImageUrl,
          unitPrice:    i.unitPrice,
          quantity:     i.quantity,
          lineTotal:    i.lineTotal,
          options:      null,   // socket payload không gửi options (đỡ payload nặng)
        })),
        distanceKm:    p.distanceKm,
        createdAt:     p.createdAt,
        isGuest:       p.isGuest,
        addressLine:   null,
        addressFull:   null,
        customerNote:  null,
        flashUntil:    Date.now() + FLASH_DURATION_MS,
      }
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`New order ${p.code}`, {
            body: `${p.contactName} · ${formatEuro(p.total)} · ${p.itemCount} items`,
            tag:  `order-${p.code}`,
          })
        }
      } catch { /* ignore */ }
      return [row, ...prev].slice(0, PAGE_LIMIT)
    })
    setTotal(prev => prev + 1)
  }, [offset, status, filters])

  const onStatusChanged = useCallback((p: OrderStatusChangedPayload) => {
    // Cross-admin sync: update row.status nếu nó có trong list hiện tại
    setOrders(prev => prev?.map(r => r.code === p.code ? { ...r, status: p.to as OrderStatus } : r) ?? prev)
  }, [])

  const { connected, joined } = useStaffOrdersSocket({ onCreated, onStatusChanged })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') void Notification.requestPermission()
  }, [])

  const liveStatus: 'live' | 'reconnecting' | 'offline' = useMemo(() => {
    if (joined)    return 'live'
    if (connected) return 'reconnecting'
    return 'offline'
  }, [connected, joined])

  function handleSort(key: SortKey, dir: SortDir) {
    setSortKey(key); setSortDir(dir)
  }
  function clearAll() {
    setStatus('all'); setFilters(EMPTY_FILTERS)
  }

  // ─── Row action handlers ───
  async function applyStatusChange(order: OrderRow, to: OrderStatus, extra: { reason?: string; bankTxId?: string } = {}) {
    try {
      const res = await api<OrderMutationResponse>(`/orders/${encodeURIComponent(order.code)}/status`, {
        method: 'POST',
        body:   { to, ...extra },
      })
      replaceRow(res.order)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to change status')
    }
  }

  function onPickTransition(order: OrderRow, to: OrderStatus) {
    if (to === 'cancelled')     { setCancelling(order); return }
    void applyStatusChange(order, to)
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.nav.orders')}
        subtitle={t('admin.orders.subtitle')}
        actions={<LiveBadge status={liveStatus} t={t} />}
      />

      <div className="space-y-4">
        {/* Filter panel */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{t('admin.orders.filter.label')}</h3>
            {filtersActive && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                {t('admin.orders.filter.clear_all')}
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterInput label={t('admin.orders.filter.code')} placeholder={t('admin.orders.filter.code_ph')} value={filters.code} onChange={v => setFilters(f => ({ ...f, code: v }))} />
              <FilterInput label={t('admin.orders.filter.customer')} placeholder={t('admin.orders.filter.customer_ph')} value={filters.customerName} onChange={v => setFilters(f => ({ ...f, customerName: v }))} />
              <FilterInput label={t('admin.orders.filter.phone')} placeholder={t('admin.orders.filter.phone_ph')} value={filters.customerPhone} onChange={v => setFilters(f => ({ ...f, customerPhone: v }))} type="tel" />
              <FilterInput label={t('admin.orders.filter.address')} placeholder={t('admin.orders.filter.address_ph')} value={filters.deliveryAddress} onChange={v => setFilters(f => ({ ...f, deliveryAddress: v }))} />
            </div>

            <div>
              <div className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">
                {t('admin.orders.filter.status')}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_FILTERS.map(f => {
                  const active = status === f.key
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatus(f.key)}
                      className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      {t(f.label as 'admin.orders.filter.all')}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading && (!orders || orders.length === 0) ? (
            <div className="text-center text-gray-500 text-sm py-16">{t('admin.orders.loading')}</div>
          ) : error ? (
            <div className="text-center text-error-600 text-sm py-16">{error}</div>
          ) : !orders || orders.length === 0 ? (
            <EmptyState t={t} hasFilter={filtersActive} />
          ) : (
            <>
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[1320px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                      <TableRow>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.code')}</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.customer')}</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.address')}</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.items')}</TableCell>
                        <SortableHeader<SortKey> sortKey="total" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">{t('admin.orders.col.total')}</SortableHeader>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.payment')}</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.orders.col.status')}</TableCell>
                        <SortableHeader<SortKey> sortKey="created" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">{t('admin.orders.col.created')}</SortableHeader>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-right"><span className="sr-only">Actions</span></TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {orders.map(o => (
                        <OrderTableRow
                          key={o.id}
                          order={o}
                          now={now}
                          role={role}
                          t={t}
                          locale={locale}
                          onPickTransition={(to) => onPickTransition(o, to)}
                          onView={() => router.push(`/admin/orders/${encodeURIComponent(o.code)}`)}
                          onEdit={() => setEditing(o)}
                          onCancel={() => setCancelling(o)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <Pagination total={total} limit={PAGE_LIMIT} offset={offset} onChange={setOffset} />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={(o) => { replaceRow(o); setEditing(null) }}
        />
      )}
      {cancelling && (
        <CancelOrderModal
          order={cancelling}
          onClose={() => setCancelling(null)}
          onConfirmed={(o) => { replaceRow(o); setCancelling(null) }}
        />
      )}
      {showOverdue && overdue && overdue.length > 0 && (
        <OverduePendingModal
          orders={overdue}
          locale={locale}
          t={t}
          onClose={() => setShowOverdue(false)}
          onView={(code) => {
            setShowOverdue(false)
            router.push(`/admin/orders/${encodeURIComponent(code)}`)
          }}
        />
      )}
    </>
  )
}

// =====================================================================
// OverduePendingModal
// =====================================================================

function OverduePendingModal({
  orders, locale, t, onClose, onView,
}: {
  orders: OrderRow[]
  locale: string
  t:      (k: string) => string
  onClose: () => void
  onView:  (code: string) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const dtFmt = locale === 'de' ? 'de-DE' : 'en-GB'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl shadow-gray-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-warning-100 bg-warning-50/60 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warning-100 text-warning-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-semibold text-gray-800">{t('admin.orders.overdue.title')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('admin.orders.overdue.subtitle').replace('{{count}}', String(orders.length))}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 transition-colors w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-white/60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3 divide-y divide-gray-100">
          {orders.map((o) => {
            const ageMs   = Date.now() - new Date(o.createdAt).getTime()
            const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000))
            const created = new Date(o.createdAt).toLocaleString(dtFmt, {
              day: '2-digit', month: '2-digit', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
            return (
              <div key={o.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{o.code}</span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-warning-100 text-warning-600">
                      {t('admin.orders.overdue.days_ago').replace('{{n}}', String(ageDays))}
                    </span>
                    {o.isGuest && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                        {t('admin.orders.guest_badge')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {o.contactName} · {o.contactPhone} · {o.contactEmail}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{created}</div>
                </div>
                <div className="text-sm text-gray-800 font-medium tabular-nums whitespace-nowrap">
                  {formatEuro(o.total)}
                </div>
                <button
                  type="button"
                  onClick={() => onView(o.code)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  {t('admin.orders.action.view')}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end px-5 py-4 border-t border-gray-100 bg-gray-50/40 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            {t('admin.orders.overdue.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Row component
// =====================================================================

interface RowProps {
  order:            OrderRow
  now:              number
  role:             AdminRole
  t:                (k: string) => string
  locale:           string
  onPickTransition: (to: OrderStatus) => void
  onView:           () => void
  onEdit:           () => void
  onCancel:         () => void
}

function OrderTableRow({ order, now, role, t, locale, onPickTransition, onView, onEdit, onCancel }: RowProps) {
  const flashing   = !!order.flashUntil && order.flashUntil > now
  const badgeClass = STATUS_BADGE[order.status]
  const created    = new Date(order.createdAt)
  const time = created.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  const date = created.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit' })

  return (
    <TableRow
      className={`transition-colors ${flashing ? 'bg-brand-50/60' : 'hover:bg-gray-50'}`}
      style={flashing ? { boxShadow: 'inset 3px 0 0 0 var(--color-brand-500)' } : undefined}
    >
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800 text-sm">{order.code}</span>
          {flashing && <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-brand-500 text-white">{t('admin.orders.new_badge')}</span>}
          {order.isGuest && <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{t('admin.orders.guest_badge')}</span>}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{order.contactEmail}</div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="text-sm text-gray-800 font-medium">{order.contactName}</div>
        <div className="text-xs text-gray-500 mt-0.5">{order.contactPhone}</div>
      </TableCell>

      <TableCell className="px-5 py-4 max-w-[260px]">
        {order.addressLine ? (
          <div className="text-xs text-gray-600 line-clamp-2" title={order.addressLine}>{order.addressLine}</div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </TableCell>

      <TableCell className="px-5 py-3 align-top">
        <ItemsCell items={order.items} fallbackCount={order.itemCount} t={t} />
      </TableCell>

      <TableCell className="px-5 py-4 text-right">
        <div className="text-sm text-gray-800 font-medium whitespace-nowrap tabular-nums">{formatEuro(order.total)}</div>
        {order.distanceKm != null && (
          <div className="text-xs text-gray-400 mt-0.5 tabular-nums">
            {order.distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km
          </div>
        )}
      </TableCell>

      <TableCell className="px-5 py-4 text-sm text-gray-500">
        <div>{paymentLabel(order.paymentMethod)}</div>
        {order.bankTxId && (
          <div
            className="text-[11px] text-gray-400 font-mono mt-0.5 truncate max-w-[140px]"
            title={order.bankTxId}
          >
            #{order.bankTxId}
          </div>
        )}
      </TableCell>

      <TableCell className="px-5 py-4">
        <StatusSelect
          current={order.status}
          role={role}
          badgeClass={badgeClass}
          t={t}
          onPick={onPickTransition}
        />
      </TableCell>

      <TableCell className="px-5 py-4 text-right">
        <div className="text-sm text-gray-600 tabular-nums whitespace-nowrap">{time}</div>
        <div className="text-xs text-gray-400 mt-0.5 tabular-nums whitespace-nowrap">{date}</div>
      </TableCell>

      <TableCell className="px-5 py-4 text-right">
        <RowActionsMenu
          role={role}
          status={order.status}
          t={t}
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
        />
      </TableCell>
    </TableRow>
  )
}

// =====================================================================
// StatusSelect — badge clickable, dropdown ra valid transitions
// =====================================================================

const ALL_STATUSES: OrderStatus[] = [
  'pending_payment', 'paid', 'preparing', 'delivering', 'completed', 'cancelled',
]

/**
 * Tính danh sách transitions hiển thị trong dropdown.
 * - Admin: TẤT CẢ status khác current (toàn quyền override state machine).
 *   Label dùng action verb nếu có, fallback status name.
 * - Staff: theo state machine (TRANSITIONS map).
 */
function getDropdownTransitions(current: OrderStatus, role: AdminRole): OrderStatus[] {
  if (role === 'admin') {
    return ALL_STATUSES.filter(s => s !== current)
  }
  return TRANSITIONS[current].filter(tr => tr.roles.includes(role)).map(tr => tr.to)
}

function StatusSelect({
  current, role, badgeClass, t, onPick,
}: {
  current:    OrderStatus
  role:       AdminRole
  badgeClass: string
  t:          (k: string) => string
  onPick:     (to: OrderStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const items   = getDropdownTransitions(current, role)
  const canClick = items.length > 0

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="left"
      width="14rem"
      trigger={
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${badgeClass} ${
            canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
          }`}
        >
          {t(STATUS_LABEL[current])}
          {canClick && (
            <svg className="w-3 h-3 opacity-60" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 9l4-5H2z" />
            </svg>
          )}
        </span>
      }
    >
      {!canClick ? (
        <div className="px-3 py-2 text-xs text-gray-400">—</div>
      ) : (
        items.map(to => {
          // Admin: action verb nếu có, fallback "→ Status Label"
          const labelKey = TRANSITION_LABEL[to]
          const label    = labelKey ? t(labelKey) : `→ ${t(STATUS_LABEL[to])}`
          return (
            <DropdownItem
              key={to}
              onClick={() => { setOpen(false); onPick(to) }}
              variant={to === 'cancelled' ? 'danger' : 'default'}
            >
              {label}
            </DropdownItem>
          )
        })
      )}
    </Dropdown>
  )
}

// =====================================================================
// RowActionsMenu — kebab dropdown
// =====================================================================

function RowActionsMenu({
  role, status, t, onView, onEdit, onCancel,
}: {
  role:   AdminRole
  status: OrderStatus
  t:      (k: string) => string
  onView: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  const [open, setOpen] = useState(false)
  const canEdit   = role === 'admin'
  const canCancel = status !== 'cancelled' && (
    role === 'admin' ||
    (role === 'staff' && (status === 'pending_payment' || status === 'delivering'))
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="right"
      width="11rem"
      trigger={
        <span
          aria-label={t('admin.orders.action.menu_aria')}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5"  r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </span>
      }
    >
      <DropdownItem onClick={() => { setOpen(false); onView() }} icon={<EyeIcon />}>
        {t('admin.orders.action.view')}
      </DropdownItem>
      <DropdownItem
        onClick={() => { setOpen(false); onEdit() }}
        icon={<EditIcon />}
        disabled={!canEdit}
      >
        {t('admin.orders.action.edit')}
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem
        onClick={() => { setOpen(false); onCancel() }}
        icon={<TrashIcon />}
        variant="danger"
        disabled={!canCancel}
      >
        {t('admin.orders.action.cancel')}
      </DropdownItem>
    </Dropdown>
  )
}

// =====================================================================
// Modals
// =====================================================================

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // ESC + backdrop click
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl shadow-gray-900/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// EditOrderModal tách ra file riêng vì cần map + autocomplete phức tạp
function EditOrderModal({
  order, onClose, onSaved,
}: { order: OrderRow; onClose: () => void; onSaved: (o: RestOrder) => void }) {
  return (
    <EditOrderModalInner
      order={order}
      onClose={onClose}
      onSaved={(o) => onSaved(o as unknown as RestOrder)}
    />
  )
}

function CancelOrderModal({
  order, onClose, onConfirmed,
}: { order: OrderRow; onClose: () => void; onConfirmed: (o: RestOrder) => void }) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  async function confirm() {
    if (!reason.trim()) return
    setBusy(true); setErr(null)
    try {
      const res = await api<OrderMutationResponse>(`/orders/${encodeURIComponent(order.code)}`, {
        method: 'DELETE', body: { reason: reason.trim() },
      })
      onConfirmed(res.order)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to cancel')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title={`${t('admin.orders.cancel.title')} · ${order.code}`} onClose={onClose}>
      <div className="p-5 space-y-3">
        <p className="text-sm text-gray-600">{t('admin.orders.cancel.body')}</p>
        <Field label={t('admin.orders.cancel.reason')}>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('admin.orders.cancel.reason_ph')}
            rows={3}
            maxLength={255}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition resize-none"
          />
        </Field>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
      <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/40">
        <button type="button" onClick={onClose} disabled={busy}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {t('admin.orders.cancel.keep')}
        </button>
        <button type="button" onClick={confirm} disabled={busy || !reason.trim()}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-error-500 text-white hover:bg-error-600 disabled:opacity-60"
        >
          {busy ? t('admin.orders.cancel.cancelling') : t('admin.orders.cancel.confirm')}
        </button>
      </div>
    </ModalShell>
  )
}

// =====================================================================
// Small UI helpers
// =====================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function TextInput({
  value, onChange, type = 'text', placeholder, autoFocus,
}: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoFocus?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
    />
  )
}

/**
 * Items cell — stack mini-rows mỗi món: thumbnail + name + qty×price + line total.
 * Cap 3 món hiển thị, còn lại "+N more" để giữ row gọn.
 */
function ItemsCell({
  items, fallbackCount, t,
}: { items: OrderItemLite[]; fallbackCount: number; t: (k: string) => string }) {
  // Empty items (vd row mới push từ socket trước khi reload) → fallback count
  if (!items || items.length === 0) {
    return <div className="text-xs text-gray-400">{fallbackCount} items</div>
  }

  const MAX = 3
  const visible = items.slice(0, MAX)
  const extra   = items.length - visible.length

  return (
    <div className="space-y-1.5 w-fit max-w-[340px]">
      {visible.map(it => (
        <div
          key={it.id}
          className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60"
        >
          <div className="relative w-9 h-9 rounded-md overflow-hidden bg-white flex-shrink-0 border border-gray-200">
            {it.dishImageUrl ? (
              <Image src={it.dishImageUrl} alt={it.dishName} fill sizes="36px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" />
                  <path d="M4 6h16" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 max-w-[160px]">
            <div className="text-[13px] text-gray-800 font-medium truncate" title={it.dishName}>
              {it.dishName}
            </div>
            <div className="text-[11px] text-gray-500 tabular-nums">
              {formatEuro(it.unitPrice)} × {it.quantity}
            </div>
          </div>
          <div className="text-[13px] text-gray-700 font-medium tabular-nums whitespace-nowrap">
            {formatEuro(it.lineTotal)}
          </div>
        </div>
      ))}
      {extra > 0 && (
        <div className="text-[11px] text-gray-500 pt-1 pl-3">
          {t('admin.orders.items.more').replace('{{count}}', String(extra))}
        </div>
      )}
    </div>
  )
}

function LiveBadge({
  status, t,
}: { status: 'live' | 'reconnecting' | 'offline'; t: (k: string) => string }) {
  const map = {
    live:         { color: 'text-success-600', dotClass: 'bg-success-500', label: t('admin.orders.live'),         pulse: true  },
    reconnecting: { color: 'text-warning-600', dotClass: 'bg-warning-500', label: t('admin.orders.reconnecting'), pulse: true  },
    offline:      { color: 'text-gray-500',    dotClass: 'bg-gray-400',    label: t('admin.orders.offline'),      pulse: false },
  }[status]
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white ${map.color}`}>
      <span className="relative inline-flex">
        <span className={`w-2 h-2 rounded-full ${map.dotClass}`} />
        {map.pulse && (
          <span className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${map.dotClass} opacity-60`} />
        )}
      </span>
      {map.label}
    </span>
  )
}

function EmptyState({ t, hasFilter }: { t: (k: string) => string; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" />
          <path d="M4 6h16" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium">
        {t(hasFilter ? 'admin.orders.no_results' : 'admin.orders.empty')}
      </p>
    </div>
  )
}

// Icons
function EyeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function restToRow(o: RestOrder): OrderRow {
  const addr = o.addressSnapshot
  const addressLine = addr
    ? [
        addr.line ?? '',
        [addr.postal_code, addr.city].filter(Boolean).join(' '),
      ].filter(s => s.trim().length > 0).join(', ')
    : null
  return {
    id:            o.id,
    code:          o.code,
    contactName:   o.contactName,
    contactPhone:  o.contactPhone,
    contactEmail:  o.contactEmail,
    total:         o.total,
    currency:      o.currency,
    status:        o.status,
    paymentMethod: o.paymentMethod,
    bankTxId:      o.bankTxId,
    itemCount:     o.items.reduce((s, i) => s + i.quantity, 0),
    items:         o.items,
    distanceKm:    o.distanceKm,
    createdAt:     o.createdAt,
    isGuest:       o.userId == null,
    addressLine:   addressLine || null,
    addressFull:   addr,
    customerNote:  o.customerNote,
  }
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}

function paymentLabel(m: PaymentMethod): string {
  switch (m) {
    case 'bank_qr_image':    return 'Bank QR'
    case 'paypal':           return 'PayPal'
    case 'cash_on_delivery': return 'Cash'
  }
}
