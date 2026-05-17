'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

// =====================================================================
// Types
// =====================================================================

interface SavedAddress {
  id: string; recipient: string; phone: string; line: string
  city: string; postalCode: string | null; country: string; isDefault: boolean
}

interface RecentOrder {
  id: string; code: string; status: string
  total: number; currency: string; paymentMethod: string; createdAt: string
}

interface StatusBreakdown { status: string; count: number }
interface PaymentBreakdown { method: string; count: number; total: number }
interface TopDish { dishId: string; slug: string | null; name: string; imageUrl: string | null; quantity: number }

interface Analytics {
  aov:                number
  cancelRate:         number
  daysSinceSignup:    number
  daysSinceLastOrder: number | null
  totalOrdersAll:     number
  statusBreakdown:    StatusBreakdown[]
  paymentBreakdown:   PaymentBreakdown[]
  topDishes:          TopDish[]
}

interface CustomerDetail {
  id: string; email: string; fullName: string; phone: string | null
  role: string; isActive: boolean
  emailVerifiedAt: string | null; lastLoginAt: string | null; createdAt: string
  totalOrders: number; totalSpent: number; lastOrderAt: string | null
  addresses:    SavedAddress[]
  recentOrders: RecentOrder[]
  analytics:    Analytics
}

const STATUS_BADGE: Record<string, string> = {
  pending_payment: 'bg-warning-50 text-warning-600',
  paid:            'bg-success-50 text-success-600',
  preparing:       'bg-brand-50 text-brand-500',
  delivering:      'bg-brand-50 text-brand-500',
  completed:       'bg-gray-100 text-gray-600',
  cancelled:       'bg-error-50 text-error-600',
}
const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'admin.status.pending_payment',
  paid:            'admin.status.paid',
  preparing:       'admin.status.preparing',
  delivering:      'admin.status.delivering',
  completed:       'admin.status.completed',
  cancelled:       'admin.status.cancelled',
}

function paymentLabel(m: string): string {
  switch (m) {
    case 'bank_qr_image':    return 'Bank QR'
    case 'paypal':           return 'PayPal'
    case 'cash_on_delivery': return 'Cash'
    default:                 return m
  }
}

// =====================================================================
// Page
// =====================================================================

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const { t, locale } = useI18n()

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // Modals
  const [editingOpen,   setEditingOpen]   = useState(false)
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | 'reset_pw' | null>(null)
  const [tempPassword,  setTempPassword]  = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api<{ customer: CustomerDetail }>(`/admin/customers/${params.id}`)
      setCustomer(res.customer)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { void fetchDetail() }, [fetchDetail])

  if (loading) {
    return <div className="text-center text-gray-500 text-sm py-16">…</div>
  }
  if (error || !customer) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-error-600 text-sm">{error ?? 'Not found'}</p>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 mt-4 text-sm text-brand-500 hover:text-brand-600">
          ← {t('admin.detail.back_to_list')}
        </Link>
      </div>
    )
  }

  const initials = customer.fullName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase()).join('') || customer.email[0].toUpperCase()

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      <AdminPageHeader
        eyebrow={
          <Link href="/admin/customers" className="hover:text-brand-600 transition-colors">
            ← {t('admin.detail.back_to_list')}
          </Link>
        }
        title={customer.fullName}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {!customer.isActive && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-error-50 text-error-600">
                {t('admin.staff.inactive')}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditingOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {t('admin.customers.action.edit')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('reset_pw')}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {t('admin.customers.action.reset_pw')}
            </button>
            {customer.isActive ? (
              <button
                type="button"
                onClick={() => setConfirmAction('deactivate')}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-error-600 border border-error-100 bg-white hover:bg-error-50"
              >
                {t('admin.customers.action.deactivate')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAction('activate')}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
              >
                {t('admin.customers.action.activate')}
              </button>
            )}
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Kpi label={t('admin.customers.col.orders')}      value={String(customer.totalOrders)} />
        <Kpi label={t('admin.customers.col.spent')}       value={formatEuro(customer.totalSpent)} accent />
        <Kpi label={t('admin.customers.detail.aov')}      value={customer.totalOrders > 0 ? formatEuro(customer.analytics.aov) : '—'} />
        <Kpi label={t('admin.customers.detail.cancel_rate')} value={`${(customer.analytics.cancelRate * 100).toFixed(0)}%`} />
        <Kpi label={t('admin.customers.detail.days_signup')} value={String(customer.analytics.daysSinceSignup)} />
        <Kpi label={t('admin.customers.detail.days_last_order')} value={customer.analytics.daysSinceLastOrder != null ? String(customer.analytics.daysSinceLastOrder) : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT — orders + addresses */}
        <div className="lg:col-span-2 space-y-4">
          <Card title={t('admin.customers.detail.recent_orders')}>
            {customer.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">{t('admin.customers.no_orders')}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100">
                    <TableRow>
                      <Th>Order #</Th>
                      <Th>Status</Th>
                      <Th align="right">Total</Th>
                      <Th align="right">Time</Th>
                      <Th><span className="sr-only">View</span></Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100">
                    {customer.recentOrders.map(o => {
                      const time = new Date(o.createdAt).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })
                      return (
                        <TableRow key={o.id} className="hover:bg-gray-50">
                          <TableCell className="px-5 py-3 text-sm font-medium text-gray-800">{o.code}</TableCell>
                          <TableCell className="px-5 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {t(STATUS_LABEL[o.status] ?? 'admin.status.pending_payment')}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right text-sm font-medium text-gray-800 tabular-nums whitespace-nowrap">
                            {formatEuro(o.total)}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">
                            {time}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-right">
                            <Link
                              href={`/admin/orders/${encodeURIComponent(o.code)}`}
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
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <Card title={t('admin.customers.detail.top_dishes')}>
            {customer.analytics.topDishes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{t('admin.customers.detail.no_dishes')}</p>
            ) : (
              <ul className="space-y-2">
                {customer.analytics.topDishes.map(d => (
                  <li key={d.dishId} className="flex items-center gap-3 py-1">
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      {d.imageUrl ? (
                        <Image src={d.imageUrl} alt={d.name} fill sizes="40px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{d.name}</div>
                    </div>
                    <div className="text-sm text-gray-600 tabular-nums whitespace-nowrap">× {d.quantity}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('admin.customers.detail.addresses')}>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">{t('admin.customers.detail.no_addresses')}</p>
            ) : (
              <ul className="space-y-2">
                {customer.addresses.map(a => (
                  <li key={a.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{a.recipient}</span>
                      {a.isDefault && (
                        <span className="text-[10px] uppercase font-semibold tracking-wider bg-brand-500 text-white px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{a.phone}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {a.line}, {[a.postalCode, a.city].filter(Boolean).join(' ')}, {a.country}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* RIGHT — contact + breakdowns */}
        <div className="space-y-4">
          <Card title={t('admin.customers.detail.contact_info')}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center font-semibold text-lg flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900 truncate">{customer.fullName}</div>
                <div className="text-xs text-gray-500 truncate">{customer.email}</div>
              </div>
            </div>
            <dl className="space-y-3">
              <Row label="Phone" value={customer.phone ?? '—'} />
              <Row label="Email verified" value={customer.emailVerifiedAt ? '✓' : '—'} />
              <Row label="Joined" value={dateFmt(customer.createdAt)} />
              <Row label="Last login" value={customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : '—'} />
            </dl>
          </Card>

          <Card title={t('admin.customers.detail.breakdown')}>
            {customer.analytics.statusBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{t('admin.customers.no_orders')}</p>
            ) : (
              <ul className="space-y-2">
                {customer.analytics.statusBreakdown.map(b => (
                  <li key={b.status} className="flex items-center justify-between text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(STATUS_LABEL[b.status] ?? 'admin.status.pending_payment')}
                    </span>
                    <span className="text-gray-700 font-medium tabular-nums">{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('admin.customers.detail.payment_breakdown')}>
            {customer.analytics.paymentBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">—</p>
            ) : (
              <ul className="space-y-3">
                {customer.analytics.paymentBreakdown.map(p => (
                  <li key={p.method}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{paymentLabel(p.method)}</span>
                      <span className="text-gray-800 font-medium tabular-nums">{p.count}</span>
                    </div>
                    <div className="text-xs text-gray-500 tabular-nums mt-0.5">{formatEuro(p.total)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      {editingOpen && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditingOpen(false)}
          onSaved={() => { setEditingOpen(false); void fetchDetail() }}
        />
      )}
      {confirmAction && (
        <ConfirmActionModal
          customer={customer}
          kind={confirmAction}
          onClose={() => setConfirmAction(null)}
          onDone={(pw) => {
            setConfirmAction(null)
            if (pw) setTempPassword(pw)
            void fetchDetail()
          }}
        />
      )}
      {tempPassword && (
        <TempPasswordModal
          email={customer.email}
          password={tempPassword}
          onClose={() => setTempPassword(null)}
        />
      )}
    </>
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

function EditCustomerModal({
  customer, onClose, onSaved,
}: { customer: CustomerDetail; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [fullName, setFullName] = useState(customer.fullName)
  const [phone,    setPhone]    = useState(customer.phone ?? '')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, string> = {}
      if (fullName.trim() !== customer.fullName)        body.fullName = fullName.trim()
      if (phone.trim()    !== (customer.phone ?? ''))    body.phone    = phone.trim()
      if (Object.keys(body).length === 0) { onClose(); return }
      await api(`/admin/customers/${customer.id}`, { method: 'PATCH', body })
      onSaved()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      title={`${t('admin.customers.edit.title')} · ${customer.email}`}
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

function ConfirmActionModal({
  customer, kind, onClose, onDone,
}: {
  customer: CustomerDetail
  kind:     'activate' | 'deactivate' | 'reset_pw'
  onClose:  () => void
  onDone:   (password?: string) => void
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const titleKey = `admin.customers.${kind === 'reset_pw' ? 'reset_pw' : kind}.title` as const
  const bodyKey  = `admin.customers.${kind === 'reset_pw' ? 'reset_pw' : kind}.body`  as const

  async function submit() {
    setBusy(true); setErr(null)
    try {
      if (kind === 'reset_pw') {
        const res = await api<{ tempPassword: string }>(`/admin/customers/${customer.id}/reset-password`, { method: 'POST' })
        onDone(res.tempPassword)
      } else {
        await api(`/admin/customers/${customer.id}/${kind}`, { method: 'POST' })
        onDone()
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
      title={`${t(titleKey)} · ${customer.email}`}
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
// Helpers
// =====================================================================

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 truncate">{label}</div>
      <div className={`text-lg font-semibold mt-1 tabular-nums ${accent ? 'text-brand-500' : 'text-gray-900'}`}>{value}</div>
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

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <TableCell isHeader className={`px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-start'}`}>
      {children}
    </TableCell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800 tabular-nums text-right break-all">{value}</dd>
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

function TextInput({ value, onChange, type = 'text', autoFocus }: {
  value: string; onChange: (v: string) => void; type?: string; autoFocus?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
    />
  )
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}
