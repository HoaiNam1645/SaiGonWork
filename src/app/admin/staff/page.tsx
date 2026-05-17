'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import Pagination from '@/components/admin/ui/Pagination'
import SearchInput from '@/components/admin/ui/SearchInput'
import Dropdown, { DropdownDivider, DropdownItem } from '@/components/admin/ui/Dropdown'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

type StaffRole = 'staff' | 'admin'

interface Staff {
  id:              string
  email:           string
  fullName:        string
  phone:           string | null
  role:            string  // 'customer' | 'staff' | 'admin'
  isActive:        boolean
  emailVerifiedAt: string | null
  lastLoginAt:     string | null
  createdAt:       string
  updatedAt:       string
}

interface ListResponse {
  staff: Staff[]
  total: number
}

const PAGE_LIMIT = 50

const ROLE_FILTERS: Array<{ key: 'all' | StaffRole; label: string }> = [
  { key: 'all',   label: 'admin.staff.filter.all'   },
  { key: 'admin', label: 'admin.staff.filter.admin' },
  { key: 'staff', label: 'admin.staff.filter.staff' },
]

// =====================================================================
// Page
// =====================================================================

export default function AdminStaffPage() {
  const { t, locale } = useI18n()
  const { user }      = useAuth()
  const meId          = user?.id ?? ''

  const [search,    setSearch]    = useState('')
  const [roleFilter, setRole]     = useState<'all' | StaffRole>('all')
  const [offset,    setOffset]    = useState(0)
  const [data,      setData]      = useState<ListResponse | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Modal state
  const [creatingOpen, setCreatingOpen]     = useState(false)
  const [editingStaff, setEditingStaff]     = useState<Staff | null>(null)
  const [confirmAction, setConfirmAction]   = useState<{
    staff:   Staff
    kind:    'deactivate' | 'activate' | 'reset_pw'
  } | null>(null)
  const [roleChangeStaff, setRoleChangeStaff] = useState<Staff | null>(null)
  const [tempPassword,    setTempPassword]    = useState<{ email: string; password: string } | null>(null)

  useEffect(() => { setOffset(0) }, [search, roleFilter])

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams()
      if (search.trim())       p.set('q',    search.trim())
      if (roleFilter !== 'all') p.set('role', roleFilter)
      p.set('limit',  String(PAGE_LIMIT))
      p.set('offset', String(offset))
      const res = await api<ListResponse>(`/admin/staff?${p.toString()}`)
      setData(res)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, offset])

  useEffect(() => { void fetchList() }, [fetchList])

  // ─── Mutation handlers ───
  async function handleCreated(staff: Staff, password: string) {
    setCreatingOpen(false)
    setTempPassword({ email: staff.email, password })
    await fetchList()
  }
  async function handleUpdated() {
    setEditingStaff(null)
    await fetchList()
  }
  async function handleRoleChanged() {
    setRoleChangeStaff(null)
    await fetchList()
  }
  async function handleConfirmed(password?: string) {
    const ca = confirmAction
    setConfirmAction(null)
    if (password && ca) setTempPassword({ email: ca.staff.email, password })
    await fetchList()
  }

  const staff     = data?.staff ?? null
  const total     = data?.total ?? 0
  const hasFilter = search.trim().length > 0 || roleFilter !== 'all'

  return (
    <>
      <AdminPageHeader
        eyebrow={t('admin.nav.people')}
        title={t('admin.nav.staff')}
        subtitle={t('admin.staff.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setCreatingOpen(true)}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('admin.staff.add')}
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin.staff.search_ph')} />
          <div className="flex items-center gap-1.5">
            {ROLE_FILTERS.map(f => {
              const active = roleFilter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setRole(f.key)}
                  className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  {t(f.label as 'admin.staff.filter.all')}
                </button>
              )
            })}
          </div>
        </div>

        {loading && !staff ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !staff || staff.length === 0 ? (
          <EmptyState t={t} hasFilter={hasFilter} />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[960px]">
                <Table>
                  <TableHeader className="border-b border-gray-100 bg-gray-50/60">
                    <TableRow>
                      <Th>{t('admin.staff.col.name')}</Th>
                      <Th>{t('admin.staff.col.contact')}</Th>
                      <Th>{t('admin.staff.col.role')}</Th>
                      <Th>{t('admin.staff.col.status')}</Th>
                      <Th align="right">{t('admin.staff.col.last_login')}</Th>
                      <Th align="right">{t('admin.staff.col.created')}</Th>
                      <Th align="right"><span className="sr-only">Actions</span></Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {staff.map(s => (
                      <StaffRowItem
                        key={s.id}
                        s={s}
                        isMe={s.id === meId}
                        locale={locale}
                        t={t}
                        onEdit={() => setEditingStaff(s)}
                        onChangeRole={() => setRoleChangeStaff(s)}
                        onActivate={() => setConfirmAction({ staff: s, kind: 'activate' })}
                        onDeactivate={() => setConfirmAction({ staff: s, kind: 'deactivate' })}
                        onResetPw={() => setConfirmAction({ staff: s, kind: 'reset_pw' })}
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

      {/* Modals */}
      {creatingOpen && (
        <CreateStaffModal
          onClose={() => setCreatingOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={handleUpdated}
        />
      )}
      {roleChangeStaff && (
        <ChangeRoleModal
          staff={roleChangeStaff}
          onClose={() => setRoleChangeStaff(null)}
          onChanged={handleRoleChanged}
        />
      )}
      {confirmAction && (
        <ConfirmActionModal
          staff={confirmAction.staff}
          kind={confirmAction.kind}
          onClose={() => setConfirmAction(null)}
          onDone={handleConfirmed}
        />
      )}
      {tempPassword && (
        <TempPasswordModal
          email={tempPassword.email}
          password={tempPassword.password}
          onClose={() => setTempPassword(null)}
        />
      )}
    </>
  )
}

// =====================================================================
// Row
// =====================================================================

interface RowProps {
  s:              Staff
  isMe:           boolean
  locale:         string
  t:              (k: string) => string
  onEdit:         () => void
  onChangeRole:   () => void
  onActivate:     () => void
  onDeactivate:   () => void
  onResetPw:      () => void
}

function StaffRowItem({ s, isMe, locale, t, onEdit, onChangeRole, onActivate, onDeactivate, onResetPw }: RowProps) {
  const [open, setOpen] = useState(false)
  const initials = s.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || s.email[0].toUpperCase()
  const created = new Date(s.createdAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const lastLogin = s.lastLoginAt
    ? new Date(s.lastLoginAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null

  const roleStyle = s.role === 'admin'
    ? 'bg-brand-50 text-brand-500'
    : 'bg-gray-100 text-gray-600'

  return (
    <TableRow className="hover:bg-gray-50 transition-colors">
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
            s.role === 'admin' ? 'bg-brand-50 text-brand-500' : 'bg-gray-100 text-gray-600'
          }`}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
              {s.fullName}
              {isMe && <span className="text-[10px] uppercase font-semibold tracking-wider bg-success-50 text-success-600 px-1.5 py-0.5 rounded">you</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{s.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 text-sm text-gray-600">
        {s.phone ?? '—'}
      </TableCell>
      <TableCell className="px-5 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${roleStyle}`}>
          {t(`admin.staff.role.${s.role}` as 'admin.staff.role.staff')}
        </span>
      </TableCell>
      <TableCell className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${s.isActive ? 'text-success-600' : 'text-gray-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
          {t(s.isActive ? 'admin.staff.active' : 'admin.staff.inactive')}
        </span>
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 tabular-nums">
        {lastLogin ?? <span className="text-xs text-gray-400">{t('admin.staff.never_login')}</span>}
      </TableCell>
      <TableCell className="px-5 py-4 text-right text-sm text-gray-600 tabular-nums">
        {created}
      </TableCell>
      <TableCell className="px-5 py-4 text-right">
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          align="right"
          width="13rem"
          trigger={
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5"  r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </span>
          }
        >
          <DropdownItem onClick={() => { setOpen(false); onEdit() }}>
            {t('admin.staff.action.edit')}
          </DropdownItem>
          <DropdownItem onClick={() => { setOpen(false); onChangeRole() }} disabled={isMe}>
            {t('admin.staff.action.role')}
          </DropdownItem>
          <DropdownItem onClick={() => { setOpen(false); onResetPw() }}>
            {t('admin.staff.action.reset_pw')}
          </DropdownItem>
          <DropdownDivider />
          {s.isActive ? (
            <DropdownItem onClick={() => { setOpen(false); onDeactivate() }} variant="danger" disabled={isMe}>
              {t('admin.staff.action.deactivate')}
            </DropdownItem>
          ) : (
            <DropdownItem onClick={() => { setOpen(false); onActivate() }}>
              {t('admin.staff.action.activate')}
            </DropdownItem>
          )}
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
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/40">{footer}</div>}
      </div>
    </div>
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

function TextInput({ value, onChange, type = 'text', autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; autoFocus?: boolean; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
    />
  )
}

// ----- CreateStaffModal -----

function CreateStaffModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (s: Staff, password: string) => void | Promise<void> }) {
  const { t } = useI18n()
  const [email,    setEmail]    = useState('')
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')
  const [role,     setRole]     = useState<StaffRole>('staff')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function submit() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, string> = { email, fullName, role }
      if (phone.trim()) body.phone = phone.trim()
      const res = await api<{ staff: Staff; tempPassword: string }>('/admin/staff', { method: 'POST', body })
      void onCreated(res.staff, res.tempPassword)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const valid = email.includes('@') && fullName.trim().length >= 2

  return (
    <ModalShell
      title={t('admin.staff.create.title')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.staff.create.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={!valid || busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? t('admin.staff.create.submitting') : t('admin.staff.create.submit')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('admin.staff.create.email')}>
          <TextInput value={email} onChange={setEmail} type="email" autoFocus />
        </Field>
        <Field label={t('admin.staff.create.fullName')}>
          <TextInput value={fullName} onChange={setFullName} />
        </Field>
        <Field label={t('admin.staff.create.phone')}>
          <TextInput value={phone} onChange={setPhone} type="tel" placeholder="+49 …" />
        </Field>
        <Field label={t('admin.staff.create.role')}>
          <select
            value={role}
            onChange={e => setRole(e.target.value as StaffRole)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
          >
            <option value="staff">{t('admin.staff.role.staff')}</option>
            <option value="admin">{t('admin.staff.role.admin')}</option>
          </select>
        </Field>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

// ----- EditStaffModal -----

function EditStaffModal({
  staff, onClose, onSaved,
}: { staff: Staff; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const { t } = useI18n()
  const [fullName, setFullName] = useState(staff.fullName)
  const [phone,    setPhone]    = useState(staff.phone ?? '')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, string> = {}
      if (fullName.trim() !== staff.fullName)         body.fullName = fullName.trim()
      if (phone.trim()    !== (staff.phone ?? ''))     body.phone    = phone.trim()
      if (Object.keys(body).length === 0) { onClose(); return }
      await api(`/admin/staff/${staff.id}`, { method: 'PATCH', body })
      void onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={`${t('admin.staff.edit.title')} · ${staff.email}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.staff.edit.cancel')}
          </button>
          <button type="button" onClick={save} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
            {busy ? t('admin.staff.edit.saving') : t('admin.staff.edit.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('admin.staff.edit.fullName')}>
          <TextInput value={fullName} onChange={setFullName} autoFocus />
        </Field>
        <Field label={t('admin.staff.edit.phone')}>
          <TextInput value={phone} onChange={setPhone} type="tel" />
        </Field>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

// ----- ChangeRoleModal -----

function ChangeRoleModal({
  staff, onClose, onChanged,
}: { staff: Staff; onClose: () => void; onChanged: () => void | Promise<void> }) {
  const { t } = useI18n()
  const [role, setRole] = useState<'customer' | StaffRole>((staff.role as 'customer' | StaffRole))
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    if (role === staff.role) { onClose(); return }
    setBusy(true); setErr(null)
    try {
      await api(`/admin/staff/${staff.id}/role`, { method: 'POST', body: { role } })
      void onChanged()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={`${t('admin.staff.role.title')} · ${staff.email}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.staff.create.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60">
            {t('admin.staff.role.confirm')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-500">{t('admin.staff.role.body')}</p>
        <Field label={t('admin.staff.create.role')}>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'customer' | StaffRole)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
          >
            <option value="customer">{t('admin.staff.role.customer')}</option>
            <option value="staff">{t('admin.staff.role.staff')}</option>
            <option value="admin">{t('admin.staff.role.admin')}</option>
          </select>
        </Field>
        {err && <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
      </div>
    </ModalShell>
  )
}

// ----- ConfirmActionModal — deactivate / activate / reset_pw -----

function ConfirmActionModal({
  staff, kind, onClose, onDone,
}: {
  staff:  Staff
  kind:   'deactivate' | 'activate' | 'reset_pw'
  onClose: () => void
  onDone:  (password?: string) => void | Promise<void>
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const titleKey   = `admin.staff.${kind === 'reset_pw' ? 'reset_pw' : kind}.title` as const
  const bodyKey    = `admin.staff.${kind === 'reset_pw' ? 'reset_pw' : kind}.body`  as const

  async function submit() {
    setBusy(true); setErr(null)
    try {
      if (kind === 'reset_pw') {
        const res = await api<{ tempPassword: string }>(`/admin/staff/${staff.id}/reset-password`, { method: 'POST' })
        void onDone(res.tempPassword)
      } else {
        const ep = kind === 'deactivate' ? 'deactivate' : 'activate'
        await api(`/admin/staff/${staff.id}/${ep}`, { method: 'POST' })
        void onDone()
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const danger = kind === 'deactivate'

  return (
    <ModalShell
      title={`${t(titleKey)} · ${staff.email}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t('admin.staff.create.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={`text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-60 ${danger ? 'bg-error-500 hover:bg-error-600' : 'bg-brand-500 hover:bg-brand-600'}`}
          >
            {t(titleKey)}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{t(bodyKey)}</p>
      {err && <div className="mt-3 rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>}
    </ModalShell>
  )
}

// ----- TempPasswordModal -----

function TempPasswordModal({
  email, password, onClose,
}: { email: string; password: string; onClose: () => void }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <ModalShell
      title={t('admin.staff.tempPw.title')}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600">
          {t('admin.staff.tempPw.close')}
        </button>
      }
    >
      <p className="text-sm text-gray-600 mb-3">{t('admin.staff.tempPw.body')}</p>
      <div className="text-xs text-gray-500 mb-1">{email}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2.5 rounded-lg bg-gray-100 text-sm font-mono text-gray-800 select-all break-all">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? t('admin.staff.tempPw.copied') : t('admin.staff.tempPw.copy')}
        </button>
      </div>
    </ModalShell>
  )
}

// =====================================================================
// Small helpers
// =====================================================================

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <TableCell isHeader className={`px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-start'}`}>
      {children}
    </TableCell>
  )
}

function EmptyState({ t, hasFilter }: { t: (k: string) => string; hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <p className="text-gray-700 text-sm font-medium">
        {t(hasFilter ? 'admin.staff.no_results' : 'admin.staff.empty')}
      </p>
    </div>
  )
}
