'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

interface Option {
  id:           string
  dishId:       string
  nameVi:       string
  nameEn:       string | null
  type:         'single' | 'multi'
  isRequired:   boolean
  displayOrder: number
  values:       Value[]
}

interface Value {
  id:           string
  dishOptionId: string
  labelVi:      string
  labelEn:      string | null
  priceDelta:   number
  displayOrder: number
  isActive:     boolean
}

interface DishLite {
  id:          string
  slug:        string
  nameVi:      string
  nameEn:      string | null
  optionCount: number
}

// =====================================================================
// Page
// =====================================================================

export default function AdminOptionsPage() {
  const { t, locale } = useI18n()
  const search = useSearchParams()
  const router = useRouter()
  const initialDishId = search.get('dishId') ?? ''

  const [dishes,   setDishes]   = useState<DishLite[]>([])
  const [dishId,   setDishId]   = useState<string>(initialDishId)
  const [dishInfo, setDishInfo] = useState<{ id: string; slug: string; nameVi: string } | null>(null)
  const [options,  setOptions]  = useState<Option[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [dishSearch, setDishSearch] = useState('')

  const [editingOption, setEditingOption] = useState<Option | 'new' | null>(null)
  const [editingValue,  setEditingValue]  = useState<{ option: Option; value: Value | null } | null>(null)
  const [deletingOption, setDeletingOption] = useState<Option | null>(null)
  const [deletingValue,  setDeletingValue]  = useState<{ option: Option; value: Value } | null>(null)

  const fmtEUR = useMemo(
    () => new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      style: 'currency', currency: 'EUR', signDisplay: 'exceptZero',
    }),
    [locale],
  )

  // Load all dishes for selector
  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ dishes: DishLite[] }>('/admin/dishes?limit=100')
        setDishes(res.dishes)
        if (!initialDishId && res.dishes.length > 0) {
          setDishId(res.dishes[0].id)
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed')
      }
    })()
  }, [initialDishId])

  // Load options for dish
  const fetchOptions = useCallback(async (id: string) => {
    if (!id) { setOptions(null); setDishInfo(null); return }
    setLoading(true); setError(null)
    try {
      const res = await api<{ dish: { id: string; slug: string; nameVi: string }; options: Option[] }>(
        `/admin/dishes/${id}/options`,
      )
      setDishInfo(res.dish)
      setOptions(res.options)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
      setOptions(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchOptions(dishId) }, [dishId, fetchOptions])

  function selectDish(id: string) {
    setDishId(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('dishId', id); else url.searchParams.delete('dishId')
    router.replace(url.pathname + (url.search || ''))
  }

  const filteredDishes = useMemo(() => {
    const q = dishSearch.trim().toLowerCase()
    if (!q) return dishes
    return dishes.filter(d => d.nameVi.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q))
  }, [dishes, dishSearch])

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.nav.menu')}
        title={t('admin.nav.options')}
        subtitle={t('admin.opt.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Dish selector */}
        <aside className="rounded-xl border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              value={dishSearch}
              onChange={e => setDishSearch(e.target.value)}
              placeholder={t('admin.dish.search_ph')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
            />
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {filteredDishes.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8">—</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredDishes.map(d => {
                  const active = d.id === dishId
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => selectDish(d.id)}
                        className={`w-full text-left px-4 py-2.5 transition-colors ${
                          active ? 'bg-brand-50/60 border-l-2 border-brand-500' : 'hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className={`text-sm truncate ${active ? 'font-medium text-brand-600' : 'text-gray-800'}`}>
                          {d.nameVi}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-gray-500 font-mono truncate">{d.slug}</span>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full ml-2 shrink-0 tabular-nums">
                            {d.optionCount}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Options panel */}
        <section className="space-y-4">
          {!dishId ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
              {t('admin.opt.no_dish')}
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">…</div>
          ) : error ? (
            <div className="rounded-xl border border-error-200 bg-error-50 py-6 text-center text-sm text-error-600">{error}</div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{t('admin.nav.dishes')}</div>
                  <div className="text-sm font-semibold text-gray-800">{dishInfo?.nameVi}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingOption('new')}
                  className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm px-3.5 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t('admin.opt.add_option')}
                </button>
              </div>

              {(!options || options.length === 0) ? (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
                  {t('admin.opt.no_options')}
                </div>
              ) : (
                <div className="space-y-4">
                  {options.map(o => (
                    <OptionCard
                      key={o.id}
                      option={o}
                      fmtEUR={fmtEUR}
                      onEdit={() => setEditingOption(o)}
                      onDelete={() => setDeletingOption(o)}
                      onAddValue={() => setEditingValue({ option: o, value: null })}
                      onEditValue={v => setEditingValue({ option: o, value: v })}
                      onDeleteValue={v => setDeletingValue({ option: o, value: v })}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {editingOption && dishId && (
        <EditOptionModal
          dishId={dishId}
          option={editingOption === 'new' ? null : editingOption}
          onClose={() => setEditingOption(null)}
          onSaved={() => { setEditingOption(null); void fetchOptions(dishId) }}
        />
      )}
      {deletingOption && (
        <DeleteOptionModal
          option={deletingOption}
          onClose={() => setDeletingOption(null)}
          onDeleted={() => { setDeletingOption(null); void fetchOptions(dishId) }}
        />
      )}
      {editingValue && (
        <EditValueModal
          option={editingValue.option}
          value={editingValue.value}
          onClose={() => setEditingValue(null)}
          onSaved={() => { setEditingValue(null); void fetchOptions(dishId) }}
        />
      )}
      {deletingValue && (
        <DeleteValueModal
          value={deletingValue.value}
          onClose={() => setDeletingValue(null)}
          onDeleted={() => { setDeletingValue(null); void fetchOptions(dishId) }}
        />
      )}
    </>
  )
}

// =====================================================================
// Option card
// =====================================================================

function OptionCard({
  option, fmtEUR, onEdit, onDelete, onAddValue, onEditValue, onDeleteValue, t,
}: {
  option: Option
  fmtEUR: Intl.NumberFormat
  onEdit: () => void
  onDelete: () => void
  onAddValue: () => void
  onEditValue: (v: Value) => void
  onDeleteValue: (v: Value) => void
  t: (k: string) => string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 truncate">{option.nameVi}</span>
              {option.nameEn && <span className="text-xs text-gray-500 truncate">/ {option.nameEn}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                option.type === 'single'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-purple-50 text-purple-600'
              }`}>
                {t(option.type === 'single' ? 'admin.opt.field.type.single' : 'admin.opt.field.type.multi')}
              </span>
              {option.isRequired && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-error-50 text-error-600">
                  {t('admin.opt.field.required')}
                </span>
              )}
              <span className="text-[10px] text-gray-500 tabular-nums">#{option.displayOrder}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-800 transition-colors"
            title={t('admin.dish.action.edit')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-error-500 hover:bg-error-50 hover:border-error-200 transition-colors"
            title={t('admin.common.delete')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Values */}
      {option.values.length === 0 ? (
        <div className="px-5 py-6 text-center text-xs text-gray-500">
          {t('admin.opt.no_values')}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {option.values.map(v => (
            <li key={v.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50/60 group transition-colors">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" style={v.isActive ? { background: 'var(--color-success-500, #10b981)' } : undefined} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${v.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{v.labelVi}</span>
                  {v.labelEn && <span className="text-xs text-gray-500">/ {v.labelEn}</span>}
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums shrink-0 text-gray-700">
                {v.priceDelta === 0 ? '—' : fmtEUR.format(v.priceDelta)}
              </span>
              <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-6 text-right">#{v.displayOrder}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => onEditValue(v)}
                  className="text-xs text-gray-600 hover:text-brand-500 px-2 py-1 rounded hover:bg-white"
                >
                  {t('admin.dish.action.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteValue(v)}
                  className="text-xs text-error-500 hover:bg-error-50 px-2 py-1 rounded"
                >
                  {t('admin.common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer: add value */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/30">
        <button
          type="button"
          onClick={onAddValue}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('admin.opt.add_value')}
        </button>
      </div>
    </div>
  )
}

// =====================================================================
// Modals
// =====================================================================

function ModalShell({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl shadow-gray-900/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/40">{footer}</div>}
      </div>
    </div>
  )
}

function EditOptionModal({
  dishId, option, onClose, onSaved,
}: { dishId: string; option: Option | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [nameVi,       setNameVi]       = useState(option?.nameVi       ?? '')
  const [nameEn,       setNameEn]       = useState(option?.nameEn       ?? '')
  const [type,         setType]         = useState<'single' | 'multi'>(option?.type ?? 'single')
  const [isRequired,   setIsRequired]   = useState(option?.isRequired   ?? false)
  const [displayOrder, setDisplayOrder] = useState(option?.displayOrder ?? 0)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const isCreate = !option
  const valid = nameVi.trim().length >= 1

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body = {
        nameVi: nameVi.trim(),
        nameEn: nameEn.trim() || null,
        type,
        isRequired,
        displayOrder,
      }
      if (isCreate) {
        await api(`/admin/dishes/${dishId}/options`, { method: 'POST', body })
      } else {
        await api(`/admin/options/${option!.id}`, { method: 'PATCH', body })
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={t(isCreate ? 'admin.opt.option_create' : 'admin.opt.option_edit')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={!valid || busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
            {busy ? t(isCreate ? 'admin.common.creating' : 'admin.common.saving') : t(isCreate ? 'admin.common.create' : 'admin.common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('admin.opt.field.option_name')}>
          <TextInput value={nameVi} onChange={setNameVi} autoFocus />
        </Field>
        <Field label={t('admin.dish.field.nameEn')}>
          <TextInput value={nameEn} onChange={setNameEn} />
        </Field>
        <Field label={t('admin.opt.field.type')}>
          <div className="flex gap-2">
            <TypeRadio value="single" checked={type === 'single'} onSelect={() => setType('single')} label={t('admin.opt.field.type.single')} />
            <TypeRadio value="multi"  checked={type === 'multi'}  onSelect={() => setType('multi')}  label={t('admin.opt.field.type.multi')} />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.opt.field.order')}>
            <input
              type="number" min="0" value={displayOrder}
              onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <label className="flex items-center gap-2 mt-6 cursor-pointer">
            <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-gray-700">{t('admin.opt.field.required')}</span>
          </label>
        </div>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

function DeleteOptionModal({
  option, onClose, onDeleted,
}: { option: Option; onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  async function confirm() {
    setBusy(true); setErr(null)
    try {
      await api(`/admin/options/${option.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ModalShell
      title={`${t('admin.opt.delete.option_title')} · ${option.nameVi}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={confirm} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-error-500 text-white hover:bg-error-600 disabled:opacity-60">
            {busy ? t('admin.common.deleting') : t('admin.common.delete')}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{t('admin.opt.delete.option_body')}</p>
      {err && <div className="mt-3 rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
    </ModalShell>
  )
}

function EditValueModal({
  option, value, onClose, onSaved,
}: { option: Option; value: Value | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [labelVi,      setLabelVi]      = useState(value?.labelVi      ?? '')
  const [labelEn,      setLabelEn]      = useState(value?.labelEn      ?? '')
  const [priceDelta,   setPriceDelta]   = useState<string>(value ? String(value.priceDelta) : '0')
  const [displayOrder, setDisplayOrder] = useState(value?.displayOrder ?? 0)
  const [isActive,     setIsActive]     = useState(value?.isActive     ?? true)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const isCreate = !value
  const valid = labelVi.trim().length >= 1

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body = {
        labelVi:    labelVi.trim(),
        labelEn:    labelEn.trim() || null,
        priceDelta: Number(priceDelta) || 0,
        displayOrder,
        isActive,
      }
      if (isCreate) {
        await api(`/admin/options/${option.id}/values`, { method: 'POST', body })
      } else {
        await api(`/admin/values/${value!.id}`, { method: 'PATCH', body })
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={t(isCreate ? 'admin.opt.value_create' : 'admin.opt.value_edit')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={save} disabled={!valid || busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
            {busy ? t(isCreate ? 'admin.common.creating' : 'admin.common.saving') : t(isCreate ? 'admin.common.create' : 'admin.common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('admin.opt.field.value_label')}>
          <TextInput value={labelVi} onChange={setLabelVi} autoFocus />
        </Field>
        <Field label={t('admin.opt.field.value_label_en')}>
          <TextInput value={labelEn} onChange={setLabelEn} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.opt.field.price_delta')}>
            <input
              type="number" step="0.01" value={priceDelta}
              onChange={e => setPriceDelta(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <Field label={t('admin.opt.field.order')}>
            <input
              type="number" min="0" value={displayOrder}
              onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-500" />
          <span className="text-sm text-gray-700">{t('admin.opt.field.active')}</span>
        </label>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

function DeleteValueModal({
  value, onClose, onDeleted,
}: { value: Value; onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  async function confirm() {
    setBusy(true); setErr(null)
    try {
      await api(`/admin/values/${value.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ModalShell
      title={`${t('admin.opt.delete.value_title')} · ${value.labelVi}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={confirm} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-error-500 text-white hover:bg-error-600 disabled:opacity-60">
            {busy ? t('admin.common.deleting') : t('admin.common.delete')}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{t('admin.opt.delete.value_body')}</p>
      {err && <div className="mt-3 rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
    </ModalShell>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
    />
  )
}

function TypeRadio({ checked, onSelect, label }: {
  value: string; checked: boolean; onSelect: () => void; label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
        checked
          ? 'border-brand-500 bg-brand-50/60 text-brand-600'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}
