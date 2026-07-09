'use client'

import { useEffect, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import ForbiddenView from '@/components/error/ForbiddenView'
import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { api, ApiError } from '@/lib/api'
import { invalidateStoreCache } from '@/lib/storeApi'
import { computeStoreStatus } from '@/lib/storeStatus'
import { useAuth } from '@/context/AuthContext'

// =====================================================================
// Types — khớp GET /api/admin/store
// =====================================================================

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = (typeof DAYS)[number]

interface StoreSettings {
  name:          string
  hotline:       string | null
  email:         string | null
  address:       string | null
  lat:           number | null
  lng:           number | null
  isOpen:        boolean
  closedMessage: string | null
  currency:      string
  openHours:     Record<Day, [string, string] | null>
  delivery: {
    radiusKm:           number | null
    baseFee:            number | null
    perKm:              number | null
    freeShipThreshold:  number | null
    kitchenPrepMinutes: number
    routingProvider:    string
  }
  payment: {
    paypalEmail:     string | null
    paypalMeLink:    string | null
    bankQrImageUrl:  string | null
    bankAccountName: string | null
    bankAccountNo:   string | null
    bankName:        string | null
  }
}

// Form state — mọi field number giữ dạng string để input rảnh tay
interface DayForm { closed: boolean; open: string; close: string }
interface FormState {
  name:          string
  hotline:       string
  email:         string
  address:       string
  lat:           string
  lng:           string
  isOpen:        boolean
  closedMessage: string
  currency:      string
  openHours:     Record<Day, DayForm>
  delivery: {
    radiusKm:           string
    baseFee:            string
    perKm:              string
    freeShipThreshold:  string
    kitchenPrepMinutes: string
  }
  payment: {
    paypalEmail:     string
    paypalMeLink:    string
    bankQrImageUrl:  string
    bankAccountName: string
    bankAccountNo:   string
    bankName:        string
  }
}

function toForm(s: StoreSettings): FormState {
  const oh = {} as Record<Day, DayForm>
  for (const d of DAYS) {
    const v = s.openHours[d]
    oh[d] = v
      ? { closed: false, open: v[0], close: v[1] }
      : { closed: true,  open: '11:00', close: '22:00' }
  }
  const numStr = (n: number | null) => (n != null ? String(n) : '')
  return {
    name:          s.name ?? '',
    hotline:       s.hotline ?? '',
    email:         s.email ?? '',
    address:       s.address ?? '',
    lat:           numStr(s.lat),
    lng:           numStr(s.lng),
    isOpen:        s.isOpen,
    closedMessage: s.closedMessage ?? '',
    currency:      s.currency ?? 'EUR',
    openHours:     oh,
    delivery: {
      radiusKm:           numStr(s.delivery.radiusKm),
      baseFee:            numStr(s.delivery.baseFee),
      perKm:              numStr(s.delivery.perKm),
      freeShipThreshold:  numStr(s.delivery.freeShipThreshold),
      kitchenPrepMinutes: String(s.delivery.kitchenPrepMinutes),
    },
    payment: {
      paypalEmail:     s.payment.paypalEmail ?? '',
      paypalMeLink:    s.payment.paypalMeLink ?? '',
      bankQrImageUrl:  s.payment.bankQrImageUrl ?? '',
      bankAccountName: s.payment.bankAccountName ?? '',
      bankAccountNo:   s.payment.bankAccountNo ?? '',
      bankName:        s.payment.bankName ?? '',
    },
  }
}

function toPayload(f: FormState) {
  const s = (v: string) => { const t = v.trim(); return t.length ? t : null }
  const nnum = (v: string) => { const t = v.trim(); return t.length ? Number(t) : null }
  const openHours = {} as Record<Day, [string, string] | null>
  for (const d of DAYS) {
    const day = f.openHours[d]
    openHours[d] = day.closed ? null : [day.open, day.close]
  }
  return {
    name:          f.name.trim(),
    hotline:       s(f.hotline),
    email:         s(f.email),
    address:       s(f.address),
    lat:           nnum(f.lat),
    lng:           nnum(f.lng),
    isOpen:        f.isOpen,
    closedMessage: s(f.closedMessage),
    currency:      f.currency.trim().toUpperCase(),
    openHours,
    delivery: {
      radiusKm:           Number(f.delivery.radiusKm || 0),
      baseFee:            Number(f.delivery.baseFee || 0),
      perKm:              Number(f.delivery.perKm || 0),
      freeShipThreshold:  nnum(f.delivery.freeShipThreshold),
      kitchenPrepMinutes: parseInt(f.delivery.kitchenPrepMinutes || '0', 10),
    },
    payment: {
      paypalEmail:     s(f.payment.paypalEmail),
      paypalMeLink:    s(f.payment.paypalMeLink),
      bankQrImageUrl:  s(f.payment.bankQrImageUrl),
      bankAccountName: s(f.payment.bankAccountName),
      bankAccountNo:   s(f.payment.bankAccountNo),
      bankName:        s(f.payment.bankName),
    },
  }
}

// =====================================================================
// Page
// =====================================================================

export default function AdminSettingsPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const [form,       setForm]       = useState<FormState | null>(null)
  const [routing,    setRouting]    = useState<string>('osrm')
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<{ status: number; message: string } | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [savedAt,    setSavedAt]    = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setLoadError(null)
      try {
        const res = await api<{ store: StoreSettings }>('/admin/store')
        if (!alive) return
        setForm(toForm(res.store))
        setRouting(res.store.delivery.routingProvider)
      } catch (e) {
        if (!alive) return
        setLoadError(
          e instanceof ApiError
            ? { status: e.status, message: e.message }
            : { status: 0, message: 'Failed to load' },
        )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // Non-admin → forbidden (BE cũng chặn, đây chỉ là UX gate)
  if (user && user.role !== 'admin') {
    return <ForbiddenView currentRole={user.role} requiredRoles={['admin']} />
  }
  if (loadError?.status === 403) {
    return <ForbiddenView currentRole={user?.role} requiredRoles={['admin']} />
  }

  function patch(updater: (prev: FormState) => FormState) {
    setForm(prev => (prev ? updater(prev) : prev))
    setSavedAt(null)
  }
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    patch(prev => ({ ...prev, [k]: v }))
  const setDelivery = (k: keyof FormState['delivery'], v: string) =>
    patch(prev => ({ ...prev, delivery: { ...prev.delivery, [k]: v } }))
  const setPayment = (k: keyof FormState['payment'], v: string) =>
    patch(prev => ({ ...prev, payment: { ...prev.payment, [k]: v } }))
  const setDay = (d: Day, v: Partial<DayForm>) =>
    patch(prev => ({ ...prev, openHours: { ...prev.openHours, [d]: { ...prev.openHours[d], ...v } } }))

  async function save() {
    if (!form) return
    setSaving(true); setSaveError(null)
    try {
      const res = await api<{ store: StoreSettings }>('/admin/store', {
        method: 'PUT',
        body:   toPayload(form),
      })
      setForm(toForm(res.store))
      setRouting(res.store.delivery.routingProvider)
      invalidateStoreCache()   // để checkout/trang công khai fetch cấu hình mới
      setSavedAt(Date.now())
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!form && form.name.trim().length > 0 && form.currency.trim().length === 3 && !saving

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.nav.settings')}
        subtitle={t('admin.settings.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs text-success-600 hidden sm:inline">
                {t('admin.settings.saved')}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('admin.settings.saving') : t('admin.settings.save')}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center text-gray-500 text-sm py-16">…</div>
      ) : !form ? (
        <div className="rounded-xl border border-error-200 bg-error-50 text-error-700 text-sm px-5 py-4">
          {loadError?.message ?? t('admin.settings.load_error')}
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {saveError && (
            <div className="rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm px-4 py-3">
              {saveError}
            </div>
          )}

          {/* ---- Store info ---- */}
          <Section title={t('admin.settings.section.store')} desc={t('admin.settings.section.store_desc')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('admin.settings.field.name')} required>
                <Input value={form.name} onChange={v => setField('name', v)} maxLength={150} />
              </Field>
              <Field label={t('admin.settings.field.hotline')}>
                <Input value={form.hotline} onChange={v => setField('hotline', v)} maxLength={20} placeholder="+49 …" />
              </Field>
              <Field label={t('admin.settings.field.email')}>
                <Input value={form.email} onChange={v => setField('email', v)} type="email" maxLength={150} />
              </Field>
              <Field label={t('admin.settings.field.currency')} required>
                <Input value={form.currency} onChange={v => setField('currency', v.toUpperCase().slice(0, 3))} maxLength={3} className="uppercase w-24" />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t('admin.settings.field.address')}>
                  <Input value={form.address} onChange={v => setField('address', v)} maxLength={255} />
                </Field>
              </div>
              <Field label={t('admin.settings.field.lat')}>
                <Input value={form.lat} onChange={v => setField('lat', v)} type="number" step="0.0000001" placeholder="48.7843" />
              </Field>
              <Field label={t('admin.settings.field.lng')}>
                <Input value={form.lng} onChange={v => setField('lng', v)} type="number" step="0.0000001" placeholder="9.1928" />
              </Field>
            </div>
          </Section>

          {/* ---- Opening hours ---- */}
          <Section title={t('admin.settings.section.hours')} desc={t('admin.settings.section.hours_desc')}>
            {/* Trạng thái nhận đơn hiệu lực (công tắc + giờ mở cửa, theo Berlin) */}
            <StoreStatusBadge form={form} t={t} />

            <label className="flex items-center gap-2 cursor-pointer mb-1.5">
              <input
                type="checkbox"
                checked={form.isOpen}
                onChange={e => setField('isOpen', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{t('admin.settings.field.is_open')}</span>
            </label>
            <p className="text-xs text-gray-400 mb-4 ml-6">{t('admin.settings.field.is_open_hint')}</p>

            {!form.isOpen && (
              <div className="mb-4">
                <Field label={t('admin.settings.field.closed_message')}>
                  <Input
                    value={form.closedMessage}
                    onChange={v => setField('closedMessage', v)}
                    maxLength={255}
                    placeholder={t('admin.settings.field.closed_message_ph')}
                  />
                </Field>
              </div>
            )}

            <div className="space-y-2">
              {DAYS.map(d => {
                const day = form.openHours[d]
                return (
                  <div key={d} className="flex items-center gap-3 flex-wrap">
                    <span className="w-24 text-sm font-medium text-gray-700">
                      {t(`admin.settings.day.${d}` as TKey)}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer w-24">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={e => setDay(d, { closed: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-xs text-gray-500">{t('admin.settings.hours.closed')}</span>
                    </label>
                    <input
                      type="time"
                      value={day.open}
                      disabled={day.closed}
                      onChange={e => setDay(d, { open: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400 tabular-nums"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={day.close}
                      disabled={day.closed}
                      onChange={e => setDay(d, { close: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-400 tabular-nums"
                    />
                  </div>
                )
              })}
            </div>
          </Section>

          {/* ---- Delivery ---- */}
          <Section title={t('admin.settings.section.delivery')} desc={t('admin.settings.section.delivery_desc')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('admin.settings.field.radius_km')} suffix="km">
                <Input value={form.delivery.radiusKm} onChange={v => setDelivery('radiusKm', v)} type="number" step="0.5" min={0} />
              </Field>
              <Field label={t('admin.settings.field.per_km')} suffix="€/km">
                <Input value={form.delivery.perKm} onChange={v => setDelivery('perKm', v)} type="number" step="0.01" min={0} />
              </Field>
              <Field label={t('admin.settings.field.base_fee')} suffix="€">
                <Input value={form.delivery.baseFee} onChange={v => setDelivery('baseFee', v)} type="number" step="0.01" min={0} />
              </Field>
              <Field label={t('admin.settings.field.free_ship_threshold')} suffix="€" hint={t('admin.settings.field.free_ship_hint')}>
                <Input value={form.delivery.freeShipThreshold} onChange={v => setDelivery('freeShipThreshold', v)} type="number" step="0.01" min={0} placeholder="—" />
              </Field>
              <Field label={t('admin.settings.field.kitchen_prep')} suffix="min">
                <Input value={form.delivery.kitchenPrepMinutes} onChange={v => setDelivery('kitchenPrepMinutes', v)} type="number" step="1" min={0} />
              </Field>
              <Field label={t('admin.settings.field.routing_provider')}>
                <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500 uppercase">{routing}</div>
              </Field>
            </div>
          </Section>

          {/* ---- Payment ---- */}
          <Section title={t('admin.settings.section.payment')} desc={t('admin.settings.section.payment_desc')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('admin.settings.field.paypal_email')}>
                <Input value={form.payment.paypalEmail} onChange={v => setPayment('paypalEmail', v)} type="email" maxLength={191} />
              </Field>
              <Field label={t('admin.settings.field.paypal_me')}>
                <Input value={form.payment.paypalMeLink} onChange={v => setPayment('paypalMeLink', v)} maxLength={255} placeholder="https://paypal.me/…" />
              </Field>
              <Field label={t('admin.settings.field.bank_name')}>
                <Input value={form.payment.bankName} onChange={v => setPayment('bankName', v)} maxLength={100} />
              </Field>
              <Field label={t('admin.settings.field.bank_account_name')}>
                <Input value={form.payment.bankAccountName} onChange={v => setPayment('bankAccountName', v)} maxLength={100} />
              </Field>
              <Field label={t('admin.settings.field.bank_account_no')}>
                <Input value={form.payment.bankAccountNo} onChange={v => setPayment('bankAccountNo', v)} maxLength={50} className="font-mono" placeholder="DE.. / IBAN" />
              </Field>
              <Field label={t('admin.settings.field.bank_qr')}>
                <Input value={form.payment.bankQrImageUrl} onChange={v => setPayment('bankQrImageUrl', v)} maxLength={500} placeholder="/payment/bank-qr.png" />
              </Field>
            </div>
          </Section>

          {/* Bottom save (tiện khi scroll dài) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {savedAt && <span className="text-xs text-success-600">{t('admin.settings.saved')}</span>}
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('admin.settings.saving') : t('admin.settings.save')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Badge trạng thái nhận đơn hiệu lực — tính từ form hiện tại (isOpen + giờ mở cửa).
function StoreStatusBadge({ form, t }: { form: FormState; t: (k: TKey) => string }) {
  const oh: Record<string, [string, string] | null> = {}
  for (const d of DAYS) {
    const day = form.openHours[d]
    oh[d] = day.closed ? null : [day.open, day.close]
  }
  const st = computeStoreStatus(form.isOpen, oh)
  const cfg = st.acceptingOrders
    ? { dot: 'bg-success-500', text: 'text-success-700', bg: 'bg-success-50 border-success-200', label: t('admin.settings.status.accepting') }
    : st.closedReason === 'manual'
      ? { dot: 'bg-error-500',   text: 'text-error-700',   bg: 'bg-error-50 border-error-200',     label: t('admin.settings.status.manual') }
      : { dot: 'bg-warning-500', text: 'text-warning-700', bg: 'bg-warning-50 border-warning-200', label: t('admin.settings.status.off_hours') }
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-4 ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  )
}

// =====================================================================
// UI helpers
// =====================================================================

function Section({ title, desc, children }: {
  title: string; desc?: string; children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Field({ label, required, suffix, hint, children }: {
  label: string; required?: boolean; suffix?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
        <span>{label}{required && <span className="text-error-500 ml-0.5">*</span>}</span>
        {suffix && <span className="text-gray-400 font-normal">{suffix}</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}

function Input({ value, onChange, type = 'text', className = '', ...rest }: {
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className'>) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 ${className}`}
      {...rest}
    />
  )
}
