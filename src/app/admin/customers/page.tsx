'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import SortableHeader, { type SortDir } from '@/components/admin/ui/SortableHeader'
import Pagination from '@/components/admin/ui/Pagination'
import SearchInput from '@/components/admin/ui/SearchInput'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

interface Customer {
  id:                  string
  email:               string
  fullName:            string
  phone:               string | null
  role:                string
  isActive:            boolean
  deactivatedAt:       string | null
  deactivationReason:  string | null
  emailVerifiedAt:     string | null
  lastLoginAt:         string | null
  createdAt:           string
  totalOrders:         number
  totalSpent:          number
  lastOrderAt:         string | null
}

interface ListResponse {
  customers: Customer[]
  total:     number
  limit:     number
  offset:    number
}

type SortKey = 'created' | 'name' | 'total_spent' | 'total_orders' | 'last_order'
type StatusFilter = 'active' | 'inactive'

const PAGE_LIMIT = 20

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'active',   label: 'admin.customers.filter.active'   },
  { key: 'inactive', label: 'admin.customers.filter.inactive' },
]

function toApiSort(key: SortKey, dir: SortDir): string {
  return `${key}_${dir}`
}

// =====================================================================
// Page
// =====================================================================

export default function AdminCustomersPage() {
  const { t, locale } = useI18n()

  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState<StatusFilter>('active')
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [offset,  setOffset]  = useState(0)

  const [data,    setData]    = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => { setOffset(0) }, [search, status, sortKey, sortDir])

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const p = new URLSearchParams()
        if (search.trim()) p.set('q', search.trim())
        p.set('status', status)
        p.set('sort',   toApiSort(sortKey, sortDir))
        p.set('limit',  String(PAGE_LIMIT))
        p.set('offset', String(offset))
        const res = await api<ListResponse>(`/admin/customers?${p.toString()}`)
        if (!alive) return
        setData(res)
      } catch (e) {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [search, status, sortKey, sortDir, offset])

  function handleSort(key: SortKey, dir: SortDir) {
    setSortKey(key); setSortDir(dir)
  }

  const customers = data?.customers ?? null
  const total     = data?.total     ?? 0
  const hasFilter = search.trim().length > 0

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.nav.people')}
        title={t('admin.nav.customers')}
        subtitle={t('admin.customers.subtitle')}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('admin.customers.search_ph')}
            />
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 shrink-0">
            {STATUS_FILTERS.map(f => {
              const active = status === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatus(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t(f.label)}
                </button>
              )
            })}
          </div>
        </div>

        {loading && !customers ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !customers || customers.length === 0 ? (
          <EmptyState t={t} hasFilter={hasFilter} />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[1100px]">
                <Table>
                  <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                    <TableRow>
                      <SortableHeader<SortKey> sortKey="name" activeKey={sortKey} activeDir={sortDir} onSort={handleSort}>
                        {t('admin.customers.col.name')}
                      </SortableHeader>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">
                        {t('admin.customers.col.contact')}
                      </TableCell>
                      <SortableHeader<SortKey> sortKey="total_orders" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">
                        {t('admin.customers.col.orders')}
                      </SortableHeader>
                      <SortableHeader<SortKey> sortKey="total_spent" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">
                        {t('admin.customers.col.spent')}
                      </SortableHeader>
                      <SortableHeader<SortKey> sortKey="last_order" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">
                        {t('admin.customers.col.last_order')}
                      </SortableHeader>
                      <SortableHeader<SortKey> sortKey="created" activeKey={sortKey} activeDir={sortDir} onSort={handleSort} align="right">
                        {t('admin.customers.col.joined')}
                      </SortableHeader>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider">
                        {t('admin.customers.col.status')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3"><span className="sr-only">View</span></TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {customers.map(c => (
                      <CustomerRow key={c.id} c={c} locale={locale} t={t} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <Pagination total={total} limit={PAGE_LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </div>
    </>
  )
}

function CustomerRow({
  c, locale, t,
}: { c: Customer; locale: string; t: (k: string) => string }) {
  const initials = c.fullName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase()).join('') || c.email[0].toUpperCase()

  const joinedStr = new Date(c.createdAt).toLocaleDateString(
    locale === 'de' ? 'de-DE' : 'en-GB',
    { day: '2-digit', month: '2-digit', year: '2-digit' },
  )
  const lastOrderStr = c.lastOrderAt
    ? new Date(c.lastOrderAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  return (
    <TableRow className={`hover:bg-gray-50 transition-colors ${c.isActive ? '' : 'bg-error-50/20'}`}>
      <TableCell className="px-5 py-4">
        <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 group">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
            c.isActive ? 'bg-brand-50 text-brand-500' : 'bg-gray-100 text-gray-400'
          }`}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-medium truncate transition-colors ${
              c.isActive ? 'text-gray-800 group-hover:text-brand-500' : 'text-gray-500 group-hover:text-gray-700'
            }`}>
              {c.fullName}
            </div>
            <div className="text-xs text-gray-500 truncate">{c.email}</div>
          </div>
        </Link>
      </TableCell>
      <TableCell className="px-5 py-4 text-sm text-gray-600">
        {c.phone ?? '—'}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-800 tabular-nums">
        {c.totalOrders}
      </TableCell>
      <TableCell className="px-5 py-4 text-right">
        {c.totalOrders === 0 ? (
          <span className="text-xs text-gray-400">{t('admin.customers.no_orders')}</span>
        ) : (
          <span className="text-sm font-medium text-gray-800 tabular-nums">{formatEuro(c.totalSpent)}</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 tabular-nums">
        {lastOrderStr}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 tabular-nums">
        {joinedStr}
      </TableCell>
      <TableCell className="px-5 py-4">
        {c.isActive ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success-600">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            {t('admin.staff.active')}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-error-600 ${c.deactivationReason ? 'cursor-help underline decoration-dotted decoration-error-300' : ''}`}
            title={c.deactivationReason ? `${t('admin.customers.deactivation.reason_label')} ${c.deactivationReason}` : undefined}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error-500" />
            {t('admin.staff.inactive')}
          </span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 text-right">
        <Link
          href={`/admin/customers/${c.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          aria-label="View"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </TableCell>
    </TableRow>
  )
}

function EmptyState({ t, hasFilter }: { t: (k: string) => string; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium">
        {t(hasFilter ? 'admin.customers.no_results' : 'admin.customers.empty')}
      </p>
    </div>
  )
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}
