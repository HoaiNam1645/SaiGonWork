'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useStoreSettings } from '@/lib/storeApi'
import {
  reverseGeocode, formatNominatim,
  type LatLng, type NominatimResult,
} from '@/lib/delivery'

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs" style={{ minHeight: 220 }}>
      …
    </div>
  ),
})

// =====================================================================
// Types
// =====================================================================

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

interface OrderRowLike {
  code:         string
  contactName:  string
  contactPhone: string
  customerNote: string | null
  addressFull:  AddressLine | null
}

interface RestOrderLike {
  id: string
  // shape khớp với restToRow input — caller dùng lại
  [k: string]: unknown
}

interface Props {
  order:   OrderRowLike
  onClose: () => void
  onSaved: (o: RestOrderLike) => void
}

// =====================================================================
// Component
// =====================================================================

export default function EditOrderModalInner({ order, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const { store } = useStoreSettings()

  // Contact
  const [name,  setName]  = useState(order.contactName)
  const [phone, setPhone] = useState(order.contactPhone)
  const [note,  setNote]  = useState(order.customerNote ?? '')

  // Address
  const a = order.addressFull
  const [line,        setLine]        = useState(a?.line       ?? '')
  const [ward,        setWard]        = useState(a?.ward       ?? '')
  const [city,        setCity]        = useState(a?.city       ?? 'Stuttgart')
  const [postal,      setPostal]      = useState(a?.postal_code ?? '')
  const [addrNote,    setAddrNote]    = useState(a?.note       ?? '')
  const [destination, setDestination] = useState<LatLng | null>(
    a?.lat != null && a?.lng != null ? { lat: a.lat, lng: a.lng } : null,
  )
  const [geocoding, setGeocoding] = useState(false)

  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  // ESC close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function applyNominatim(r: NominatimResult) {
    setLine(formatNominatim(r))
    const x = r.address ?? {}
    if (x.postcode) setPostal(x.postcode)
    const ct = x.city ?? x.town ?? x.village ?? x.suburb
    if (ct) setCity(ct)
  }

  function onSelectAutocomplete(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestination({ lat, lng })
    }
    applyNominatim(r)
  }

  async function onMarkerDrag(pos: LatLng) {
    setDestination(pos)
    setGeocoding(true)
    const r = await reverseGeocode(pos)
    if (r) applyNominatim(r)
    setGeocoding(false)
  }

  async function save() {
    setBusy(true); setErr(null)
    try {
      const body: Record<string, unknown> = {}

      // Contact / note diffs
      if (name.trim()  && name.trim()  !== order.contactName)  body.contactName  = name.trim()
      if (phone.trim() && phone.trim() !== order.contactPhone) body.contactPhone = phone.trim()
      if (note !== (order.customerNote ?? ''))                  body.customerNote = note.trim()

      // Address diff — chỉ gửi nếu có thay đổi
      const addrPatch: Record<string, unknown> = {}
      const curr = order.addressFull ?? {}
      if (line.trim()        && line.trim()       !== (curr.line       ?? '')) addrPatch.line        = line.trim()
      if ((ward || null)     !== (curr.ward       ?? null))                     addrPatch.ward        = ward.trim() || null
      if (city.trim()        && city.trim()       !== (curr.city       ?? '')) addrPatch.city        = city.trim()
      if ((postal || null)   !== (curr.postal_code ?? null))                    addrPatch.postal_code = postal.trim() || null
      if ((addrNote || null) !== (curr.note       ?? null))                     addrPatch.note        = addrNote.trim() || null
      if (destination?.lat   !== (curr.lat ?? null))                            addrPatch.lat         = destination?.lat ?? null
      if (destination?.lng   !== (curr.lng ?? null))                            addrPatch.lng         = destination?.lng ?? null
      if (Object.keys(addrPatch).length > 0) body.address = addrPatch

      if (Object.keys(body).length === 0) { onClose(); return }

      const res = await api<{ order: RestOrderLike }>(`/orders/${encodeURIComponent(order.code)}`, {
        method: 'PATCH', body,
      })
      onSaved(res.order)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl shadow-gray-900/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <h3 className="text-base font-semibold text-gray-800">
            {t('admin.orders.edit.title')} · {order.code}
          </h3>
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

        <div className="p-5 space-y-5">
          {/* Contact */}
          <Section title={t('admin.detail.customer')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('admin.orders.edit.contact_name')}>
                <TextInput value={name} onChange={setName} />
              </Field>
              <Field label={t('admin.orders.edit.contact_phone')}>
                <TextInput value={phone} onChange={setPhone} type="tel" />
              </Field>
            </div>
            <Field label={t('admin.orders.edit.customer_note')}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition resize-none"
              />
            </Field>
          </Section>

          {/* Address */}
          <Section title={t('admin.orders.edit.address')}>
            <AddressAutocomplete
              value={line}
              onChangeText={setLine}
              onSelect={onSelectAutocomplete}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <Field label="Apt / Floor">
                <TextInput value={ward} onChange={setWard} />
              </Field>
              <Field label="PLZ">
                <TextInput value={postal} onChange={setPostal} />
              </Field>
              <Field label="Stadt">
                <TextInput value={city} onChange={setCity} />
              </Field>
            </div>
            <Field label={t('admin.detail.address_note')}>
              <TextInput value={addrNote} onChange={setAddrNote} />
            </Field>

            {/* Map */}
            <div className="rounded-lg overflow-hidden border border-gray-200 mt-1">
              {destination ? (
                <div className="relative" style={{ height: 280 }}>
                  <CheckoutMap
                    origin={store?.lat != null && store?.lng != null
                      ? { lat: store.lat, lng: store.lng, name: store.name, address: store.address }
                      : undefined}
                    destination={destination}
                    routeGeometry={null}
                    onDestinationChange={onMarkerDrag}
                  />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white text-[11px] border border-gray-200 shadow-sm">
                    {geocoding
                      ? <span className="text-gray-500">{t('account.address.locating_pin')}</span>
                      : <span className="text-gray-600">{t('account.address.drag_pin_hint')}</span>}
                  </div>
                  {/* Legend */}
                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-3 px-2.5 py-1 rounded-lg bg-white text-[11px] border border-gray-200 shadow-sm">
                    {store?.lat != null && store?.lng != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c96442' }} />
                        <span className="text-gray-700">{t('admin.detail.legend.store')}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#141413' }} />
                      <span className="text-gray-700">{t('admin.detail.legend.destination')}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 text-center text-xs text-gray-400 py-12 px-6">
                  {t('checkout.map.placeholder.body')}
                </div>
              )}
            </div>
          </Section>

          {err && (
            <div className="rounded-lg bg-error-50 text-error-600 text-xs px-3 py-2 border border-error-100">{err}</div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {t('admin.orders.edit.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? t('admin.orders.edit.saving') : t('admin.orders.edit.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Helpers
// =====================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-gray-500 mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
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

function TextInput({
  value, onChange, type = 'text',
}: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
    />
  )
}
