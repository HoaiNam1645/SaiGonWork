'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import SearchInput from '@/components/admin/ui/SearchInput'
import Pagination from '@/components/admin/ui/Pagination'
import SortableHeader, { type SortDir } from '@/components/admin/ui/SortableHeader'
import Dropdown, { DropdownDivider, DropdownItem } from '@/components/admin/ui/Dropdown'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

interface Dish {
  id:             string
  categoryId:     string
  slug:           string
  nameVi:         string
  nameEn:         string | null
  descriptionVi:  string | null
  descriptionEn:  string | null
  price:          number
  currency:       string
  imageUrl:       string | null
  isAvailable:    boolean
  isFeatured:     boolean
  prepTimeMin:    number | null
  calories:       number | null
  spicyLevel:     number
  displayOrder:   number
  createdAt:      string
  updatedAt:      string
  category:       { id: string; slug: string; nameVi: string } | null
  optionCount:    number
  orderItemCount: number
}

interface CategoryLite { id: string; slug: string; nameVi: string; nameEn: string | null }

interface ListResponse {
  dishes: Dish[]
  total:  number
  limit:  number
  offset: number
}

type SortKey = 'display' | 'name' | 'price' | 'created'

function sortToApi(k: SortKey, d: SortDir): string {
  if (k === 'display') return d === 'asc' ? 'display_asc' : 'display_desc'
  if (k === 'name')    return d === 'asc' ? 'name_asc'    : 'name_desc'
  if (k === 'price')   return d === 'asc' ? 'price_asc'   : 'price_desc'
  return d === 'asc' ? 'created_asc' : 'created_desc'
}

const LIMIT = 20

// =====================================================================
// Page
// =====================================================================

export default function AdminDishesPage() {
  const { t, locale } = useI18n()
  const [categories,   setCategories]   = useState<CategoryLite[]>([])
  const [items,        setItems]        = useState<Dish[] | null>(null)
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // Filters
  const [search,       setSearch]       = useState('')
  const [categoryId,   setCategoryId]   = useState<string>('')
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)

  // Sort & paging
  const [sortKey, setSortKey] = useState<SortKey>('display')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [offset,  setOffset]  = useState(0)

  // Modals
  const [editing,  setEditing]  = useState<Dish | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Dish | null>(null)
  // Popup cảnh báo (vd khi vượt giới hạn featured)
  const [notice,   setNotice]   = useState<{ title: string; body: string } | null>(null)

  const fmtEUR = useMemo(
    () => new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' }),
    [locale],
  )

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ categories: CategoryLite[] }>('/admin/categories')
        setCategories(res.categories)
      } catch { /* ignore */ }
    })()
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams()
      if (search.trim()) p.set('q', search.trim())
      if (categoryId)    p.set('categoryId', categoryId)
      if (availability !== 'all') p.set('availability', availability)
      if (featuredOnly)  p.set('featuredOnly', '1')
      p.set('sort',   sortToApi(sortKey, sortDir))
      p.set('limit',  String(LIMIT))
      p.set('offset', String(offset))

      const res = await api<ListResponse>(`/admin/dishes?${p.toString()}`)
      setItems(res.dishes)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, availability, featuredOnly, sortKey, sortDir, offset])

  useEffect(() => { void fetchList() }, [fetchList])

  // Reset paging khi filter/sort thay đổi
  useEffect(() => { setOffset(0) }, [search, categoryId, availability, featuredOnly, sortKey, sortDir])

  function handleSort(key: SortKey, dir: SortDir) { setSortKey(key); setSortDir(dir) }

  async function toggleAvailability(d: Dish) {
    try {
      const res = await api<{ dish: Dish }>(`/admin/dishes/${d.id}/toggle-availability`, { method: 'POST' })
      setItems(prev => prev?.map(x => x.id === d.id ? res.dish : x) ?? prev)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  async function toggleFeatured(d: Dish) {
    try {
      const res = await api<{ dish: Dish }>(`/admin/dishes/${d.id}/toggle-featured`, { method: 'POST' })
      setItems(prev => prev?.map(x => x.id === d.id ? res.dish : x) ?? prev)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'FEATURED_LIMIT_REACHED') {
        setNotice({
          title: t('admin.dish.featured_limit.title'),
          body:  e.message,
        })
        return
      }
      setNotice({
        title: t('admin.dish.toggle_failed.title'),
        body:  e instanceof ApiError ? e.message : 'Failed',
      })
    }
  }

  const hasFilter = !!(search.trim() || categoryId || availability !== 'all' || featuredOnly)

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.nav.menu')}
        title={t('admin.nav.dishes')}
        subtitle={t('admin.dish.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('admin.dish.add')}
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        {/* Filter bar */}
        <div className="px-5 py-4 border-b border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder={t('admin.dish.search_ph')} />
          </div>
          <SelectInput
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: '', label: t('admin.dish.filter.all') },
              ...categories.map(c => ({ value: c.id, label: c.nameVi })),
            ]}
          />
          <div className="flex items-center gap-2">
            <SelectInput
              value={availability}
              onChange={v => setAvailability(v as 'all' | 'available' | 'unavailable')}
              options={[
                { value: 'all',          label: t('admin.dish.filter.availability.all') },
                { value: 'available',    label: t('admin.dish.filter.availability.available') },
                { value: 'unavailable',  label: t('admin.dish.filter.availability.unavailable') },
              ]}
            />
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={e => setFeaturedOnly(e.target.checked)}
                className="w-4 h-4 accent-brand-500"
              />
              {t('admin.dish.filter.featured')}
            </label>
          </div>
        </div>

        {loading && !items ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !items || items.length === 0 ? (
          <Empty t={t} hasFilter={hasFilter} />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                  <TableRow>
                    <Th>{t('admin.dish.col.name')}</Th>
                    <Th>{t('admin.dish.col.category')}</Th>
                    <SortableHeader<SortKey>
                      sortKey="price" activeKey={sortKey} activeDir={sortDir}
                      onSort={handleSort} align="right"
                    >
                      {t('admin.dish.col.price')}
                    </SortableHeader>
                    <Th>{t('admin.dish.col.flags')}</Th>
                    <Th align="right">{t('admin.dish.col.options')}</Th>
                    <SortableHeader<SortKey>
                      sortKey="display" activeKey={sortKey} activeDir={sortDir}
                      onSort={handleSort} align="right"
                    >
                      {t('admin.dish.field.order')}
                    </SortableHeader>
                    <Th align="right"><span className="sr-only">Actions</span></Th>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {items.map(d => (
                    <DishRow
                      key={d.id}
                      d={d}
                      fmtEUR={fmtEUR}
                      onEdit={() => setEditing(d)}
                      onDelete={() => setDeleting(d)}
                      onToggleAvailable={() => toggleAvailability(d)}
                      onToggleFeatured={() => toggleFeatured(d)}
                      t={t}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </div>

      {editing && (
        <EditDishModal
          dish={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void fetchList() }}
        />
      )}
      {deleting && (
        <DeleteDishModal
          dish={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); void fetchList() }}
        />
      )}
      {notice && (
        <NoticeModal
          title={notice.title}
          body={notice.body}
          dismissLabel={t('admin.dish.notice.dismiss')}
          onClose={() => setNotice(null)}
        />
      )}
    </>
  )
}

// =====================================================================
// NoticeModal — popup cảnh báo chung (warning style)
// =====================================================================

function NoticeModal({
  title, body, dismissLabel, onClose,
}: { title: string; body: string; dismissLabel: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl shadow-gray-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-warning-100 bg-warning-50/60 rounded-t-xl">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warning-100 text-warning-600">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h3 className="text-base font-semibold text-gray-800 flex-1">{title}</h3>
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
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700" style={{ lineHeight: 1.6 }}>{body}</p>
        </div>
        <div className="flex justify-end px-5 py-4 border-t border-gray-100 bg-gray-50/40 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Row
// =====================================================================

function DishRow({
  d, fmtEUR, onEdit, onDelete, onToggleAvailable, onToggleFeatured, t,
}: {
  d: Dish
  fmtEUR: Intl.NumberFormat
  onEdit: () => void
  onDelete: () => void
  onToggleAvailable: () => void
  onToggleFeatured:  () => void
  t: (k: string) => string
}) {
  const [open, setOpen] = useState(false)
  return (
    <TableRow className="hover:bg-gray-50 transition-colors">
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
            {d.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-800 truncate">{d.nameVi}</span>
              {d.isFeatured && (
                <span className="inline-flex items-center gap-0.5 bg-warning-50 text-warning-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" /></svg>
                  {t('admin.dish.flag.featured')}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">{d.slug}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 text-sm text-gray-700">
        {d.category?.nameVi ?? '—'}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm font-medium text-gray-800 tabular-nums">
        {fmtEUR.format(d.price)}
      </TableCell>
      <TableCell className="px-5 py-4">
        <button
          type="button"
          onClick={onToggleAvailable}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
            d.isAvailable
              ? 'bg-success-50 text-success-600 hover:bg-success-50/70'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${d.isAvailable ? 'bg-success-500' : 'bg-gray-400'}`} />
          {t(d.isAvailable ? 'admin.dish.flag.available' : 'admin.dish.flag.unavailable')}
        </button>
      </TableCell>
      <TableCell className="px-5 py-4 text-right">
        <Link
          href={`/admin/menu/options?dishId=${d.id}`}
          className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline tabular-nums"
        >
          {d.optionCount}
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 tabular-nums">{d.displayOrder}</TableCell>
      <TableCell className="px-5 py-4 text-right">
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          align="right"
          width="13rem"
          trigger={
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5"  r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </span>
          }
        >
          <DropdownItem onClick={() => { setOpen(false); onEdit() }}>
            {t('admin.dish.action.edit')}
          </DropdownItem>
          <DropdownItem onClick={() => { setOpen(false); onToggleAvailable() }}>
            {t('admin.dish.action.toggle_available')}
          </DropdownItem>
          <DropdownItem onClick={() => { setOpen(false); onToggleFeatured() }}>
            {t('admin.dish.action.toggle_featured')}
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={() => { setOpen(false); onDelete() }} variant="danger">
            {t('admin.common.delete')}
          </DropdownItem>
        </Dropdown>
      </TableCell>
    </TableRow>
  )
}

// =====================================================================
// Modals
// =====================================================================

function ModalShell({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl bg-white shadow-2xl shadow-gray-900/10 max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/40">{footer}</div>}
      </div>
    </div>
  )
}

function EditDishModal({
  dish, categories, onClose, onSaved,
}: { dish: Dish | null; categories: CategoryLite[]; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [categoryId,    setCategoryId]    = useState(dish?.categoryId ?? (categories[0]?.id ?? ''))
  const [slug,          setSlug]          = useState(dish?.slug          ?? '')
  const [nameVi,        setNameVi]        = useState(dish?.nameVi        ?? '')
  const [nameEn,        setNameEn]        = useState(dish?.nameEn        ?? '')
  const [descriptionVi, setDescriptionVi] = useState(dish?.descriptionVi ?? '')
  const [descriptionEn, setDescriptionEn] = useState(dish?.descriptionEn ?? '')
  const [imageUrl,      setImageUrl]      = useState(dish?.imageUrl      ?? '')
  const [price,         setPrice]         = useState<string>(dish ? String(dish.price) : '0')
  const [prepTimeMin,   setPrepTimeMin]   = useState<string>(dish?.prepTimeMin?.toString() ?? '')
  const [calories,      setCalories]      = useState<string>(dish?.calories?.toString()    ?? '')
  const [spicyLevel,    setSpicyLevel]    = useState(dish?.spicyLevel    ?? 0)
  const [displayOrder,  setDisplayOrder]  = useState(dish?.displayOrder  ?? 0)
  const [isAvailable,   setIsAvailable]   = useState(dish?.isAvailable   ?? true)
  const [isFeatured,    setIsFeatured]    = useState(dish?.isFeatured    ?? false)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCreate = !dish
  const valid = !!categoryId && slug.length >= 2 && nameVi.length >= 2 && Number(price) >= 0

  // Upload ảnh từ máy → /upload/dish-image (route handler FE, chỉ admin) → điền URL
  async function uploadImage(f: File) {
    setUploading(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/upload/dish-image', { method: 'POST', body: fd })
      if (!res.ok) {
        const code = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(code?.error === 'FILE_TOO_LARGE' ? t('admin.dish.upload.too_large') : t('admin.dish.upload.failed'))
      }
      const data = (await res.json()) as { url: string }
      setImageUrl(data.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('admin.dish.upload.failed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, unknown> = {
        categoryId,
        slug,
        nameVi,
        nameEn:        nameEn.trim()        || null,
        descriptionVi: descriptionVi.trim() || null,
        descriptionEn: descriptionEn.trim() || null,
        imageUrl:      imageUrl.trim()      || null,
        price:         Number(price),
        prepTimeMin:   prepTimeMin.trim() === '' ? null : Number(prepTimeMin),
        calories:      calories.trim()    === '' ? null : Number(calories),
        spicyLevel,
        displayOrder,
        isAvailable,
        isFeatured,
      }
      if (isCreate) {
        await api('/admin/dishes', { method: 'POST', body })
      } else {
        await api(`/admin/dishes/${dish!.id}`, { method: 'PATCH', body })
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
      wide
      title={t(isCreate ? 'admin.dish.create.title' : 'admin.dish.edit.title')}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.dish.field.category')}>
            <SelectInput
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map(c => ({ value: c.id, label: c.nameVi }))}
            />
          </Field>
          <Field label={t('admin.dish.field.slug')}>
            <TextInput value={slug} onChange={setSlug} mono />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.dish.field.nameVi')}>
            <TextInput value={nameVi} onChange={setNameVi} autoFocus />
          </Field>
          <Field label={t('admin.dish.field.nameEn')}>
            <TextInput value={nameEn} onChange={setNameEn} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.dish.field.descVi')}>
            <TextArea value={descriptionVi} onChange={setDescriptionVi} rows={3} />
          </Field>
          <Field label={t('admin.dish.field.descEn')}>
            <TextArea value={descriptionEn} onChange={setDescriptionEn} rows={3} />
          </Field>
        </div>
        <Field label={t('admin.dish.field.image')}>
          <div className="flex items-start gap-3">
            {/* Preview */}
            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
              {imageUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <TextInput value={imageUrl} onChange={setImageUrl} placeholder="https://… hoặc /dishes/…" />
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) void uploadImage(f) }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || busy}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploading ? t('admin.dish.upload.uploading') : t('admin.dish.upload.button')}
                </button>
                {imageUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    disabled={uploading || busy}
                    className="text-xs text-gray-500 hover:text-error-600 disabled:opacity-60 transition-colors"
                  >
                    {t('admin.dish.upload.remove')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-4 gap-3">
          <Field label={`${t('admin.dish.field.price')} (€)`}>
            <input
              type="number" step="0.01" min="0" value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <Field label={t('admin.dish.field.prep')}>
            <input
              type="number" min="0" value={prepTimeMin}
              onChange={e => setPrepTimeMin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <Field label={t('admin.dish.field.calories')}>
            <input
              type="number" min="0" value={calories}
              onChange={e => setCalories(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <Field label={t('admin.dish.field.spicy')}>
            <SelectInput
              value={String(spicyLevel)}
              onChange={v => setSpicyLevel(Number(v))}
              options={[0, 1, 2, 3].map(n => ({ value: String(n), label: '🌶'.repeat(n) || '—' }))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <Field label={t('admin.dish.field.order')}>
            <input
              type="number" min="0" value={displayOrder}
              onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition tabular-nums"
            />
          </Field>
          <label className="flex items-center gap-2 mt-6 cursor-pointer">
            <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-gray-700">{t('admin.dish.field.available')}</span>
          </label>
          <label className="flex items-center gap-2 mt-6 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-brand-500" />
            <span className="text-sm text-gray-700">{t('admin.dish.field.featured')}</span>
          </label>
        </div>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

function DeleteDishModal({
  dish, onClose, onDeleted,
}: { dish: Dish; onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const blocked = dish.orderItemCount > 0

  async function confirm() {
    setBusy(true); setErr(null)
    try {
      await api(`/admin/dishes/${dish.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={`${t('admin.dish.delete.title')} · ${dish.nameVi}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.common.cancel')}
          </button>
          <button type="button" onClick={confirm} disabled={blocked || busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-error-500 text-white hover:bg-error-600 disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? t('admin.common.deleting') : t('admin.common.delete')}
          </button>
        </>
      }
    >
      {blocked ? (
        <p className="text-sm text-error-600">
          {t('admin.dish.delete.has_orders').replace('{{count}}', String(dish.orderItemCount))}
        </p>
      ) : (
        <p className="text-sm text-gray-600">{t('admin.dish.delete.body')}</p>
      )}
      {err && <div className="mt-3 rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
    </ModalShell>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <TableCell isHeader className={`px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-start'}`}>
      {children}
    </TableCell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, mono, autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; mono?: boolean; autoFocus?: boolean; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition ${mono ? 'font-mono' : ''}`}
    />
  )
}

function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition resize-y"
    />
  )
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition bg-white"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Empty({ t, hasFilter }: { t: (k: string) => string; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7M9 7V5a3 3 0 016 0v2" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium">
        {t(hasFilter ? 'admin.dish.no_results' : 'admin.dish.empty')}
      </p>
    </div>
  )
}
