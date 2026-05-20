'use client'

import { useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import SearchInput from '@/components/admin/ui/SearchInput'
import Pagination from '@/components/admin/ui/Pagination'
import PromotionFormModal, { emptyForm, type PromoType, type PromotionFormValue } from '@/components/admin/promotions/PromotionFormModal'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

interface Promotion {
  id:           string
  code:         string
  description:  string | null
  type:         PromoType
  value:        number
  minOrder:     number
  maxDiscount:  number | null
  startsAt:     string | null
  endsAt:       string | null
  usageLimit:   number | null
  perUserLimit: number | null
  usedCount:    number
  isActive:     boolean
  createdAt:    string
  updatedAt:    string
}

interface ListResponse {
  promotions: Promotion[]
  total:      number
  limit:      number
  offset:     number
}

type StatusFilter = 'all' | 'active' | 'inactive'
const PAGE_LIMIT = 50

export default function AdminPromotionsPage() {
  const { t, locale } = useI18n()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [offset, setOffset] = useState(0)

  const [data,    setData]    = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)  // force reload

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [initialForm, setInitialForm] = useState<PromotionFormValue | undefined>(undefined)
  const [submitting,  setSubmitting]  = useState(false)
  const [modalError,  setModalError]  = useState<string | null>(null)

  useEffect(() => { setOffset(0) }, [search, status])

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const p = new URLSearchParams()
        if (search.trim()) p.set('q', search.trim())
        p.set('status', status)
        p.set('limit',  String(PAGE_LIMIT))
        p.set('offset', String(offset))
        const res = await api<ListResponse>(`/admin/promotions?${p.toString()}`)
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
  }, [search, status, offset, tick])

  function reload() { setTick(x => x + 1) }

  function openCreate() {
    setEditingId(null)
    setInitialForm(emptyForm)
    setModalError(null)
    setModalOpen(true)
  }

  function openEdit(p: Promotion) {
    setEditingId(p.id)
    setInitialForm({
      id:           p.id,
      code:         p.code,
      description:  p.description ?? '',
      type:         p.type,
      value:        String(p.value),
      minOrder:     String(p.minOrder),
      maxDiscount:  p.maxDiscount != null ? String(p.maxDiscount) : '',
      startsAt:     toLocalInput(p.startsAt),
      endsAt:       toLocalInput(p.endsAt),
      usageLimit:   p.usageLimit   != null ? String(p.usageLimit)   : '',
      perUserLimit: p.perUserLimit != null ? String(p.perUserLimit) : '',
      isActive:     p.isActive,
    })
    setModalError(null)
    setModalOpen(true)
  }

  async function submit(v: PromotionFormValue) {
    setSubmitting(true); setModalError(null)
    try {
      const payload: Record<string, unknown> = {
        code:         v.code.trim().toUpperCase(),
        description:  v.description.trim() || null,
        type:         v.type,
        value:        v.type === 'free_ship' ? 0 : Number(v.value),
        minOrder:     Number(v.minOrder) || 0,
        maxDiscount:  v.maxDiscount.trim() ? Number(v.maxDiscount) : null,
        startsAt:     v.startsAt ? new Date(v.startsAt).toISOString() : null,
        endsAt:       v.endsAt   ? new Date(v.endsAt).toISOString()   : null,
        usageLimit:   v.usageLimit.trim()   ? parseInt(v.usageLimit, 10)   : null,
        perUserLimit: v.perUserLimit.trim() ? parseInt(v.perUserLimit, 10) : null,
        isActive:     v.isActive,
      }
      if (editingId) {
        // Update: bỏ code (immutable trong UI để tránh lỗi snapshot)
        delete payload.code
        await api(`/admin/promotions/${editingId}`, { method: 'PATCH', body: payload })
      } else {
        await api('/admin/promotions', { method: 'POST', body: payload })
      }
      setModalOpen(false)
      reload()
    } catch (e) {
      setModalError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(p: Promotion) {
    try {
      await api(`/admin/promotions/${p.id}/toggle`, { method: 'POST' })
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  async function remove(p: Promotion) {
    if (!confirm(t('admin.promo.confirm_delete').replace('{{code}}', p.code))) return
    try {
      await api(`/admin/promotions/${p.id}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  const promotions = data?.promotions ?? null
  const total      = data?.total      ?? 0
  const hasFilter  = search.trim().length > 0 || status !== 'all'

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.nav.promotions')}
        subtitle={t('admin.promo.subtitle')}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('admin.promo.new')}
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('admin.promo.search_ph')}
            />
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 shrink-0">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(k => {
              const active = status === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatus(k)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t(`admin.promo.filter.${k}`)}
                </button>
              )
            })}
          </div>
        </div>

        {loading && !promotions ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !promotions || promotions.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-gray-600">
              {t(hasFilter ? 'admin.promo.no_results' : 'admin.promo.empty')}
            </p>
          </div>
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">
                        {t('admin.promo.col.code')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">
                        {t('admin.promo.col.discount')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">
                        {t('admin.promo.col.window')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-end">
                        {t('admin.promo.col.usage')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider">
                        {t('admin.promo.col.status')}
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3"><span className="sr-only">Actions</span></TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {promotions.map(p => (
                      <PromoRow
                        key={p.id}
                        p={p}
                        locale={locale}
                        t={t}
                        onEdit={() => openEdit(p)}
                        onToggle={() => void toggleActive(p)}
                        onDelete={() => void remove(p)}
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

      <PromotionFormModal
        open={modalOpen}
        initial={initialForm}
        editing={!!editingId}
        submitting={submitting}
        errorText={modalError}
        onSubmit={submit}
        onClose={() => { if (!submitting) setModalOpen(false) }}
      />
    </>
  )
}

function PromoRow({ p, locale, t, onEdit, onToggle, onDelete }: {
  p: Promotion
  locale: string
  t: (k: string) => string
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const fmtDate = (iso: string | null) => iso
    ? new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  const discountText =
    p.type === 'percent'    ? `${p.value}%${p.maxDiscount ? ` (max ${formatEuro(p.maxDiscount)})` : ''}` :
    p.type === 'fixed'      ? `-${formatEuro(p.value)}` :
                              t('admin.promo.type.free_ship')

  const window = p.startsAt || p.endsAt
    ? `${fmtDate(p.startsAt)} → ${fmtDate(p.endsAt)}`
    : t('admin.promo.always')

  const usageText = p.usageLimit
    ? `${p.usedCount} / ${p.usageLimit}`
    : `${p.usedCount}`

  return (
    <TableRow className={`hover:bg-gray-50 transition-colors ${p.isActive ? '' : 'bg-gray-50/50'}`}>
      <TableCell className="px-5 py-4">
        <div className="font-mono text-sm font-semibold text-gray-800">{p.code}</div>
        {p.description && (
          <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{p.description}</div>
        )}
        {p.minOrder > 0 && (
          <div className="text-[11px] text-gray-400 mt-0.5">
            {t('admin.promo.min_order_chip').replace('{{amount}}', formatEuro(p.minOrder))}
          </div>
        )}
      </TableCell>
      <TableCell className="px-5 py-4 text-sm text-gray-700">
        {discountText}
      </TableCell>
      <TableCell className="px-5 py-4 text-xs text-gray-600 tabular-nums">
        {window}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-700 tabular-nums">
        {usageText}
      </TableCell>
      <TableCell className="px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            p.isActive ? 'text-success-600' : 'text-gray-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
          {p.isActive ? t('admin.promo.active') : t('admin.promo.inactive')}
        </button>
      </TableCell>
      <TableCell className="px-5 py-4 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            aria-label="Edit"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {p.usedCount === 0 && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-error-50 hover:border-error-200 hover:text-error-600 transition-colors"
              aria-label="Delete"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}

/** ISO → "YYYY-MM-DDTHH:mm" for datetime-local input */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
