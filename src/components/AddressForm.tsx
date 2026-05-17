'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/i18n/I18nContext'
import AddressAutocomplete from './AddressAutocomplete'
import {
  formatNominatim,
  reverseGeocode,
  type LatLng,
  type NominatimResult,
} from '@/lib/delivery'

const CheckoutMap = dynamic(() => import('./CheckoutMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-2xl bg-[#e8e6dc] flex items-center justify-center text-[#87867f] text-[13px]"
      style={{ minHeight: 280 }}
    >
      …
    </div>
  ),
})

// =====================================================================
// Types
// =====================================================================

export interface AddressFormValue {
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

export const EMPTY_ADDRESS: AddressFormValue = {
  recipient:  '',
  phone:      '',
  line:       '',
  ward:       null,
  district:   null,
  city:       'Stuttgart',
  country:    'DE',
  postalCode: null,
  lat:        null,
  lng:        null,
  note:       null,
  isDefault:  false,
}

interface Props {
  initial?:    Partial<AddressFormValue>
  submitting?: boolean
  errorText?:  string | null
  /** Cho phép bỏ tick "đặt làm mặc định" — vd khi đây là address duy nhất, BE force default */
  forceDefault?: boolean
  onSubmit:    (v: AddressFormValue) => void
  onCancel:    () => void
}

// =====================================================================
// Component
// =====================================================================

export default function AddressForm({
  initial, submitting, errorText, forceDefault, onSubmit, onCancel,
}: Props) {
  const { t } = useI18n()

  const [recipient,  setRecipient]  = useState(initial?.recipient  ?? '')
  const [phone,      setPhone]      = useState(initial?.phone      ?? '')
  const [line,       setLine]       = useState(initial?.line       ?? '')
  const [apt,        setApt]        = useState(initial?.ward       ?? '')  // dùng "ward" làm apt
  const [city,       setCity]       = useState(initial?.city       ?? 'Stuttgart')
  const [postal,     setPostal]     = useState(initial?.postalCode ?? '')
  const [destination, setDestination] = useState<LatLng | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  )
  const [note,       setNote]       = useState(initial?.note       ?? '')
  const [isDefault,  setIsDefault]  = useState(initial?.isDefault  ?? false)

  const [locating,      setLocating]      = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // ─── Helpers ───
  function applyNominatim(r: NominatimResult) {
    setLine(formatNominatim(r))
    const a = r.address ?? {}
    if (a.postcode) setPostal(a.postcode)
    const ct = a.city ?? a.town ?? a.village ?? a.suburb
    if (ct) setCity(ct)
  }

  function onSelectAutocomplete(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestination({ lat, lng })
      setLocationError(null)
    }
    applyNominatim(r)
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError(t('checkout.location_error'))
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setDestination({ lat, lng })
        const r = await reverseGeocode({ lat, lng })
        if (r) applyNominatim(r)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError(t('checkout.location_error'))
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  // Khi user kéo marker → reverseGeocode auto fill text
  async function onMarkerDrag(pos: LatLng) {
    setDestination(pos)
    setReverseLoading(true)
    const r = await reverseGeocode(pos)
    if (r) applyNominatim(r)
    setReverseLoading(false)
  }

  // ─── Validation ───
  const valid =
    recipient.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    line.trim().length >= 5 &&
    city.trim().length > 0 &&
    destination != null

  function submit() {
    if (!valid || submitting) return
    onSubmit({
      recipient:  recipient.trim(),
      phone:      phone.trim(),
      line:       line.trim(),
      ward:       apt.trim() || null,
      district:   null,
      city:       city.trim(),
      country:    'DE',
      postalCode: postal.trim() || null,
      lat:        destination?.lat ?? null,
      lng:        destination?.lng ?? null,
      note:       note.trim() || null,
      isDefault:  forceDefault ? true : isDefault,
    })
  }

  return (
    <div className="space-y-4">
      {/* Contact */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t('account.address.recipient')} required>
          <TextInput value={recipient} onChange={setRecipient} />
        </Field>
        <Field label={t('account.address.phone')} required>
          <TextInput value={phone} onChange={setPhone} type="tel" />
        </Field>
      </div>

      {/* Autocomplete + location */}
      <div>
        <AddressAutocomplete
          value={line}
          onChangeText={setLine}
          onSelect={onSelectAutocomplete}
        />
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#c96442] hover:text-[#d97757] disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? t('checkout.locating') : t('checkout.use_location')}
          </button>
          {locationError && <span className="text-[12px] text-[#b53333]">{locationError}</span>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label={t('checkout.field.address_apt')}>
          <TextInput value={apt} onChange={setApt} />
        </Field>
        <Field label="PLZ">
          <TextInput value={postal} onChange={setPostal} />
        </Field>
        <Field label="Stadt">
          <TextInput value={city} onChange={setCity} />
        </Field>
      </div>

      {/* Map with draggable marker (KHÔNG hiện shop — đây là set địa chỉ cá nhân) */}
      <div className="rounded-2xl overflow-hidden" style={{ minHeight: 300 }}>
        {destination ? (
          <div className="relative">
            <div style={{ height: 300 }}>
              <CheckoutMap
                destination={destination}
                routeGeometry={null}
                onDestinationChange={onMarkerDrag}
              />
            </div>
            <div
              className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f5] text-[12px]"
              style={{ boxShadow: '0 0 0 1px #e8e6dc, 0 4px 24px rgba(0,0,0,0.05)' }}
            >
              {reverseLoading
                ? <span className="text-[#87867f]">{t('account.address.locating_pin')}</span>
                : <span className="text-[#5e5d59]">{t('account.address.drag_pin_hint')}</span>}
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl bg-[#e8e6dc]/60 border-2 border-dashed border-[#e8e6dc] flex flex-col items-center justify-center text-center px-6"
            style={{ minHeight: 240 }}
          >
            <svg
              className="w-10 h-10 text-[#87867f] mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="font-display text-[#141413] text-[16px] font-medium">
              {t('checkout.map.placeholder.title')}
            </div>
            <div className="text-[13px] text-[#5e5d59] mt-1 max-w-xs" style={{ lineHeight: 1.5 }}>
              {t('checkout.map.placeholder.body')}
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      <Field label={t('account.address.note_label')}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('account.address.note_placeholder')}
          rows={2}
          maxLength={255}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white text-[#141413] text-[14px] placeholder:text-[#87867f] outline-none resize-none"
          style={{ boxShadow: '0 0 0 1px #e8e6dc', lineHeight: 1.5 }}
        />
      </Field>

      {/* Default toggle */}
      {!forceDefault && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 accent-[#c96442]"
          />
          <span className="text-[13px] text-[#4d4c48]">
            {t('account.address.set_default')}
          </span>
        </label>
      )}

      {errorText && (
        <div
          className="rounded-xl px-3.5 py-2.5 text-[13px]"
          style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
        >
          {errorText}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 bg-[#e8e6dc] hover:bg-[#f0eee6] disabled:opacity-60 text-[#4d4c48] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
        >
          {t('account.address.cancel')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || submitting}
          className="flex-1 bg-[#c96442] hover:bg-[#d97757] disabled:bg-[#e8e6dc] disabled:text-[#87867f] disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
        >
          {submitting ? t('account.address.saving') : t('account.address.save')}
        </button>
      </div>
    </div>
  )
}

// =====================================================================
// Local helpers
// =====================================================================

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase text-[#87867f] font-medium mb-1.5"
        style={{ letterSpacing: '0.5px' }}
      >
        {label}
        {required && <span className="text-[#c96442] ml-0.5">*</span>}
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
