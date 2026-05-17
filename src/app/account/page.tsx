'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddressForm, { type AddressFormValue } from '@/components/AddressForm'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

const MAX_ADDRESSES = 3

interface SavedAddress {
  id:         string
  recipient:  string
  phone:      string
  line:       string
  ward:       string | null
  district:   string | null
  city:       string
  country:    string
  postalCode: string | null
  lat:        number | null
  lng:        number | null
  note:       string | null
  isDefault:  boolean
}

// =====================================================================
// Page
// =====================================================================

export default function AccountPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useI18n()

  // Mounted flag: trên SSR + first client render trả cùng layout (Header+Footer+empty main)
  // để hydration match. Sau khi mount mới check user/redirect — giống pattern ở Header.tsx.
  // AuthContext lazy init đọc localStorage trên client → user khác giữa server (null)
  // và client (có thể truthy) nếu không defer.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (user === null) router.replace('/auth/login?next=/account')
  }, [mounted, user, router])

  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-24">
        {mounted && user ? (
          <div className="max-w-3xl mx-auto px-5 sm:px-6">
            <div className="mb-8">
              <div
                className="text-[10px] uppercase text-[#87867f] mb-3"
                style={{ letterSpacing: '0.5px' }}
              >
                {t('account.eyebrow')}
              </div>
              <h1
                className="font-display text-[#141413] text-[28px] sm:text-[35px] font-medium"
                style={{ lineHeight: 1.15 }}
              >
                {t('account.title')}
              </h1>
            </div>

            <div className="space-y-4">
              <ProfileSection />
              <AddressesSection />
            </div>
          </div>
        ) : (
          <div className="text-center text-[#87867f] text-[13px] pt-8">…</div>
        )}
      </main>
      <Footer />
    </>
  )
}

// =====================================================================
// Profile section
// =====================================================================

function ProfileSection() {
  const { user, refresh } = useAuth()
  const { t, locale } = useI18n()

  const [name,    setName]    = useState(user?.fullName ?? '')
  const [phone,   setPhone]   = useState(user?.phone    ?? '')
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState<'idle' | 'saved' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  useEffect(() => {
    setName(user?.fullName ?? '')
    setPhone(user?.phone   ?? '')
  }, [user?.fullName, user?.phone])

  const changed =
    user != null &&
    (name.trim() !== user.fullName ||
      (phone.trim() || null) !== (user.phone ?? null))

  async function save() {
    if (!changed || saving) return
    setSaving(true)
    setStatus('idle')
    setErrMsg(null)
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body:   {
          fullName: name.trim(),
          phone:    phone.trim(),
        },
        locale,
      })
      await refresh()
      setStatus('saved')
      window.setTimeout(() => setStatus('idle'), 2500)
    } catch (e) {
      setStatus('error')
      setErrMsg(e instanceof ApiError ? e.message : t('account.profile.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className="rounded-2xl bg-[#faf9f5] p-5 sm:p-6"
      style={{ boxShadow: '0 0 0 1px #f0eee6' }}
    >
      <h2
        className="font-display text-[#141413] text-[20px] font-medium mb-5"
        style={{ lineHeight: 1.2 }}
      >
        {t('account.section.profile')}
      </h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('account.profile.name')}>
          <TextInput value={name} onChange={setName} />
        </Field>
        <Field label={t('account.profile.phone')}>
          <TextInput value={phone} onChange={setPhone} type="tel" />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('account.profile.email')}>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#e8e6dc]/40 text-[#5e5d59] text-[15px] outline-none cursor-not-allowed"
                style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
              />
              <Link
                href="/auth/change-email"
                className="text-[13px] text-[#c96442] hover:text-[#d97757] whitespace-nowrap"
              >
                {t('account.profile.email_change')}
              </Link>
            </div>
          </Field>
        </div>
      </div>

      {errMsg && status === 'error' && (
        <div
          className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]"
          style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
        >
          {errMsg}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          className="bg-[#c96442] hover:bg-[#d97757] disabled:bg-[#e8e6dc] disabled:text-[#87867f] disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? t('account.profile.saving') : t('account.profile.save')}
        </button>
        {status === 'saved' && (
          <span className="text-[13px] text-[#c96442]">{t('account.profile.saved')}</span>
        )}
      </div>
    </section>
  )
}

// =====================================================================
// Addresses section
// =====================================================================

function AddressesSection() {
  const { t, locale } = useI18n()
  const [list,    setList]    = useState<SavedAddress[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode,    setMode]    = useState<{ kind: 'idle' } | { kind: 'add' } | { kind: 'edit'; addr: SavedAddress }>({ kind: 'idle' })
  const [busy,    setBusy]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ addresses: SavedAddress[] }>('/addresses', { locale })
      setList(res.addresses)
    } catch (e) {
      console.warn('[account/addresses]', e)
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const count = list?.length ?? 0
  const atLimit = count >= MAX_ADDRESSES

  async function createAddress(v: AddressFormValue) {
    setBusy(true)
    setFormError(null)
    try {
      await api('/addresses', {
        method: 'POST',
        body: payload(v),
        locale,
      })
      await load()
      setMode({ kind: 'idle' })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ADDRESS_LIMIT') {
        setFormError(t('account.addresses.limit_reached').replace('{{max}}', String(MAX_ADDRESSES)))
      } else {
        setFormError(e instanceof ApiError ? e.message : t('account.profile.error'))
      }
    } finally {
      setBusy(false)
    }
  }

  async function updateAddress(id: string, v: AddressFormValue) {
    setBusy(true)
    setFormError(null)
    try {
      await api(`/addresses/${id}`, {
        method: 'PATCH',
        body: payload(v),
        locale,
      })
      await load()
      setMode({ kind: 'idle' })
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t('account.profile.error'))
    } finally {
      setBusy(false)
    }
  }

  async function setDefault(id: string) {
    try {
      await api(`/addresses/${id}/default`, { method: 'POST', locale })
      await load()
    } catch (e) { console.warn('[setDefault]', e) }
  }

  async function remove(id: string) {
    if (!window.confirm(t('account.addresses.confirm_delete'))) return
    try {
      await api(`/addresses/${id}`, { method: 'DELETE', locale })
      await load()
    } catch (e) { console.warn('[delete]', e) }
  }

  return (
    <section
      className="rounded-2xl bg-[#faf9f5] p-5 sm:p-6"
      style={{ boxShadow: '0 0 0 1px #f0eee6' }}
    >
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
        <h2
          className="font-display text-[#141413] text-[20px] font-medium"
          style={{ lineHeight: 1.2 }}
        >
          {t('account.section.addresses')}
        </h2>
        {list && (
          <span className="text-[12px] text-[#87867f]">
            {t('account.addresses.count')
              .replace('{{count}}', String(count))
              .replace('{{max}}',   String(MAX_ADDRESSES))}
          </span>
        )}
      </div>

      {/* Form add/edit */}
      {mode.kind !== 'idle' && (
        <div className="rounded-xl bg-white p-4 sm:p-5 mb-4" style={{ boxShadow: '0 0 0 1px #e8e6dc' }}>
          <h3
            className="font-display text-[#141413] text-[16px] font-medium mb-4"
            style={{ lineHeight: 1.2 }}
          >
            {mode.kind === 'add'
              ? t('account.addresses.add_form_title')
              : t('account.addresses.edit_form_title')}
          </h3>
          <AddressForm
            initial={mode.kind === 'edit' ? toFormValue(mode.addr) : undefined}
            submitting={busy}
            errorText={formError}
            forceDefault={count === 0 && mode.kind === 'add'}
            onCancel={() => { setMode({ kind: 'idle' }); setFormError(null) }}
            onSubmit={(v) => {
              if (mode.kind === 'add')   void createAddress(v)
              else                        void updateAddress(mode.addr.id, v)
            }}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-[#87867f] text-[13px] py-8">…</div>
      ) : list && list.length > 0 ? (
        <div className="space-y-3">
          {list.map(addr => (
            <AddressCard
              key={addr.id}
              addr={addr}
              onEdit={() => { setMode({ kind: 'edit', addr }); setFormError(null) }}
              onDelete={() => void remove(addr.id)}
              onSetDefault={() => void setDefault(addr.id)}
            />
          ))}
        </div>
      ) : (
        mode.kind === 'idle' && (
          <p className="text-[14px] text-[#87867f] py-2">{t('account.addresses.empty')}</p>
        )
      )}

      {/* Add button */}
      {mode.kind === 'idle' && !atLimit && (
        <button
          type="button"
          onClick={() => { setMode({ kind: 'add' }); setFormError(null) }}
          className="mt-4 inline-flex items-center gap-2 bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('account.addresses.add')}
        </button>
      )}
      {mode.kind === 'idle' && atLimit && (
        <p className="mt-4 text-[12px] text-[#87867f]">
          {t('account.addresses.limit_reached').replace('{{max}}', String(MAX_ADDRESSES))}
        </p>
      )}
    </section>
  )
}

// =====================================================================
// AddressCard
// =====================================================================

function AddressCard({
  addr, onEdit, onDelete, onSetDefault,
}: {
  addr: SavedAddress
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl bg-white p-4" style={{ boxShadow: '0 0 0 1px #e8e6dc' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#141413] text-[15px]">{addr.recipient}</span>
            {addr.isDefault && (
              <span className="text-[10px] uppercase tracking-wide bg-[#c96442] text-[#faf9f5] px-1.5 py-0.5 rounded">
                {t('account.addresses.tag.default')}
              </span>
            )}
          </div>
          <div className="text-[13px] text-[#5e5d59] mt-0.5">{addr.phone}</div>
          <div className="text-[13px] text-[#5e5d59] mt-1" style={{ lineHeight: 1.4 }}>
            {[
              addr.line,
              addr.ward,
              [addr.postalCode, addr.city].filter(Boolean).join(' '),
            ].filter(Boolean).join(', ')}
          </div>
          {addr.note && (
            <div className="text-[12px] text-[#87867f] italic mt-1">{addr.note}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {!addr.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            className="text-[12px] bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {t('account.addresses.action.set_default')}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="text-[12px] bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] px-2.5 py-1.5 rounded-lg transition-colors"
        >
          {t('account.addresses.action.edit')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-[12px] bg-white hover:bg-[#fef3f2] text-[#b53333] px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ boxShadow: '0 0 0 1px #f4cdca' }}
        >
          {t('account.addresses.action.delete')}
        </button>
      </div>
    </div>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function toFormValue(a: SavedAddress): AddressFormValue {
  return {
    recipient:  a.recipient,
    phone:      a.phone,
    line:       a.line,
    ward:       a.ward,
    district:   a.district,
    city:       a.city,
    country:    a.country,
    postalCode: a.postalCode,
    lat:        a.lat,
    lng:        a.lng,
    note:       a.note,
    isDefault:  a.isDefault,
  }
}

function payload(v: AddressFormValue) {
  return {
    recipient:  v.recipient,
    phone:      v.phone,
    line:       v.line,
    ward:       v.ward,
    district:   v.district,
    city:       v.city,
    country:    v.country,
    postalCode: v.postalCode,
    lat:        v.lat,
    lng:        v.lng,
    note:       v.note,
    isDefault:  v.isDefault,
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase text-[#87867f] font-medium mb-1.5"
        style={{ letterSpacing: '0.5px' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function TextInput({
  value, onChange, type = 'text',
}: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl bg-white text-[#141413] text-[15px] outline-none transition"
      style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #c96442')}
      onBlur={(e) => (e.currentTarget.style.boxShadow = '0 0 0 1px #e8e6dc')}
    />
  )
}
