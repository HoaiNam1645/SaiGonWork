'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import SearchInput from '@/components/admin/ui/SearchInput'
import Dropdown, { DropdownDivider, DropdownItem } from '@/components/admin/ui/Dropdown'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

interface Category {
  id:            string
  slug:          string
  nameVi:        string
  nameEn:        string | null
  descriptionVi: string | null
  descriptionEn: string | null
  imageUrl:      string | null
  displayOrder:  number
  isActive:      boolean
  dishCount:     number
  createdAt:     string
  updatedAt:     string
}

interface ListResponse { categories: Category[] }

// =====================================================================
// Page
// =====================================================================

export default function AdminCategoriesPage() {
  const { t } = useI18n()
  const [search,    setSearch]    = useState('')
  const [items,     setItems]     = useState<Category[] | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [editing,   setEditing]   = useState<Category | 'new' | null>(null)
  const [deleting,  setDeleting]  = useState<Category | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams()
      if (search.trim()) p.set('q', search.trim())
      const res = await api<ListResponse>(`/admin/categories?${p.toString()}`)
      setItems(res.categories)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { void fetchList() }, [fetchList])

  async function toggleActive(c: Category) {
    try {
      await api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } })
      setItems(prev => prev?.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x) ?? prev)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.nav.menu')}
        title={t('admin.nav.categories')}
        subtitle={t('admin.cat.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('admin.cat.add')}
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin.cat.search_ph')} />
        </div>

        {loading && !items ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !items || items.length === 0 ? (
          <Empty t={t} hasFilter={search.trim().length > 0} />
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                <TableRow>
                  <Th align="center" width="w-16">{t('admin.cat.col.order')}</Th>
                  <Th>{t('admin.cat.col.name')}</Th>
                  <Th>{t('admin.cat.col.slug')}</Th>
                  <Th align="right" width="w-24">{t('admin.cat.col.dishes')}</Th>
                  <Th width="w-28">{t('admin.cat.col.status')}</Th>
                  <Th align="right" width="w-14"><span className="sr-only">Actions</span></Th>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {items.map(c => (
                  <CategoryRow
                    key={c.id}
                    c={c}
                    onEdit={() => setEditing(c)}
                    onDelete={() => setDeleting(c)}
                    onToggle={() => toggleActive(c)}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && (
        <EditCategoryModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void fetchList() }}
        />
      )}
      {deleting && (
        <DeleteCategoryModal
          category={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); void fetchList() }}
        />
      )}
    </>
  )
}

// =====================================================================
// Row
// =====================================================================

function CategoryRow({ c, onEdit, onDelete, onToggle, t }: {
  c: Category; onEdit: () => void; onDelete: () => void; onToggle: () => void; t: (k: string) => string
}) {
  const [open, setOpen] = useState(false)
  return (
    <TableRow className="hover:bg-gray-50/70 transition-colors">
      <TableCell className="px-5 py-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-600 tabular-nums">
          {c.displayOrder}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3">
        <div className="text-sm font-medium text-gray-800 leading-tight">{c.nameVi}</div>
        {c.nameEn && <div className="text-xs text-gray-500 mt-0.5 leading-tight">{c.nameEn}</div>}
      </TableCell>
      <TableCell className="px-5 py-3">
        <span className="inline-flex items-center text-[12px] text-gray-600 font-mono bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md">
          {c.slug}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3 text-right">
        <span className={`text-sm tabular-nums ${c.dishCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
          {c.dishCount}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
            c.isActive
              ? 'bg-success-50 text-success-600 hover:bg-success-50/70'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
          {t(c.isActive ? 'admin.staff.active' : 'admin.staff.inactive')}
        </button>
      </TableCell>
      <TableCell className="px-5 py-3 text-right">
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          align="right"
          width="11rem"
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

function EditCategoryModal({
  category, onClose, onSaved,
}: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [slug,         setSlug]         = useState(category?.slug         ?? '')
  const [nameVi,       setNameVi]       = useState(category?.nameVi       ?? '')
  const [nameEn,       setNameEn]       = useState(category?.nameEn       ?? '')
  const [imageUrl,     setImageUrl]     = useState(category?.imageUrl     ?? '')
  const [displayOrder, setDisplayOrder] = useState(category?.displayOrder ?? 0)
  const [isActive,     setIsActive]     = useState(category?.isActive     ?? true)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const isCreate = !category
  const valid = slug.length >= 2 && nameVi.length >= 2

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, unknown> = {
        slug, nameVi,
        nameEn:       nameEn.trim()   || null,
        imageUrl:     imageUrl.trim() || null,
        displayOrder,
        isActive,
      }
      if (isCreate) {
        await api('/admin/categories', { method: 'POST', body })
      } else {
        await api(`/admin/categories/${category!.id}`, { method: 'PATCH', body })
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
      title={t(isCreate ? 'admin.cat.create.title' : 'admin.cat.edit.title')}
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
        <Field label={t('admin.cat.field.slug')}>
          <TextInput value={slug} onChange={setSlug} mono autoFocus />
        </Field>
        <Field label={t('admin.cat.field.nameVi')}>
          <TextInput value={nameVi} onChange={setNameVi} />
        </Field>
        <Field label={t('admin.cat.field.nameEn')}>
          <TextInput value={nameEn} onChange={setNameEn} />
        </Field>
        <Field label={t('admin.cat.field.image')}>
          <TextInput value={imageUrl} onChange={setImageUrl} placeholder="https://…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('admin.cat.field.order')}>
            <input
              type="number"
              value={displayOrder}
              onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
            />
          </Field>
          <Field label={t('admin.cat.field.active')}>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-500" />
              <span className="text-sm text-gray-700">{isActive ? t('admin.staff.active') : t('admin.staff.inactive')}</span>
            </label>
          </Field>
        </div>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

function DeleteCategoryModal({
  category, onClose, onDeleted,
}: { category: Category; onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const blocked = category.dishCount > 0

  async function confirm() {
    setBusy(true); setErr(null)
    try {
      await api(`/admin/categories/${category.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={`${t('admin.cat.delete.title')} · ${category.nameVi}`}
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
          {t('admin.cat.delete.has_dishes').replace('{{count}}', String(category.dishCount))}
        </p>
      ) : (
        <p className="text-sm text-gray-600">{t('admin.cat.delete.body')}</p>
      )}
      {err && <div className="mt-3 rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
    </ModalShell>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function Th({ children, align = 'left', width }: {
  children: React.ReactNode; align?: 'left' | 'center' | 'right'; width?: string
}) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-start'
  return (
    <TableCell isHeader className={`px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider ${alignClass} ${width ?? ''}`}>
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

function Empty({ t, hasFilter }: { t: (k: string) => string; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 7H2v10h20zM2 12h20" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium">
        {t(hasFilter ? 'admin.cat.no_results' : 'admin.cat.empty')}
      </p>
    </div>
  )
}
