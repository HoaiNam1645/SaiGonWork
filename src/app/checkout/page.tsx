'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useCart } from '@/context/CartContext'
import { useI18n } from '@/i18n/I18nContext'
import {
  DELIVERY,
  RESTAURANT,
  computeShipping,
  fetchRoute,
  formatEuro,
  formatNominatim,
  reverseGeocode,
  type LatLng,
  type NominatimResult,
  type RouteResult,
} from '@/lib/delivery'

const CheckoutMap = dynamic(() => import('@/components/CheckoutMap'), {
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

type PaymentMethod = 'card' | 'paypal' | 'bank' | 'cash'
type DeliveryTime = 'now' | 'scheduled'

export default function CheckoutPage() {
  const { t, locale } = useI18n()
  const { items, total: subtotal, clearCart } = useCart()

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [addressText, setAddressText] = useState('')
  const [addressApt, setAddressApt] = useState('')
  const [destination, setDestination] = useState<LatLng | null>(null)
  const [time, setTime] = useState<DeliveryTime>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('card')
  const [note, setNote] = useState('')

  // Location state
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Route state
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routing, setRouting] = useState(false)
  const routeAbortRef = useRef<AbortController | null>(null)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  // Compute shipping based on subtotal + km
  const km = route?.distanceKm ?? null
  const shipping = useMemo(() => computeShipping(km, subtotal), [km, subtotal])
  const total = subtotal + (shipping ?? 0)
  const outOfZone = km != null && km > DELIVERY.maxRadiusKm
  const freeShippingDelta = DELIVERY.freeShippingThreshold - subtotal
  const freeShippingUnlocked = subtotal >= DELIVERY.freeShippingThreshold
  const freeShippingProgress = Math.min(100, (subtotal / DELIVERY.freeShippingThreshold) * 100)

  // Fetch route whenever destination changes
  useEffect(() => {
    if (!destination) {
      setRoute(null)
      return
    }
    if (routeAbortRef.current) routeAbortRef.current.abort()
    const ctrl = new AbortController()
    routeAbortRef.current = ctrl
    setRouting(true)
    fetchRoute(RESTAURANT, destination, ctrl.signal).then((r) => {
      if (ctrl.signal.aborted) return
      setRoute(r)
      setRouting(false)
    })
    return () => {
      ctrl.abort()
    }
  }, [destination])

  function onSelectAddress(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestination({ lat, lng })
      setLocationError(null)
    }
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
        const reverse = await reverseGeocode({ lat, lng })
        if (reverse) {
          setAddressText(formatNominatim(reverse))
        }
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError(t('checkout.location_error'))
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const requiredOk =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    addressText.trim().length > 0 &&
    destination != null &&
    !outOfZone &&
    items.length > 0

  function placeOrder() {
    if (!requiredOk) return
    setSubmitting(true)
    // Mock submit — generate an id, clear cart, show success
    setTimeout(() => {
      const id = `sgw-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`
      setSubmittedId(id)
      clearCart()
      setSubmitting(false)
    }, 800)
  }

  // ─────────────────────────────────────────────
  // Empty cart fallback
  if (items.length === 0 && !submittedId) {
    return (
      <>
        <Header />
        <main className="menu-page-bg min-h-screen pt-32 pb-24">
          <div className="max-w-xl mx-auto px-5 sm:px-6 text-center">
            <div
              className="rounded-2xl bg-[#faf9f5] py-16 px-6"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
              <h1
                className="font-display text-[#141413] text-[28px] font-medium"
                style={{ lineHeight: 1.2 }}
              >
                {t('checkout.empty.title')}
              </h1>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-6 bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
              >
                {t('checkout.empty.cta')} →
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ─────────────────────────────────────────────
  // Success state
  if (submittedId) {
    return (
      <>
        <Header />
        <main className="menu-page-bg min-h-screen pt-32 pb-24">
          <div className="max-w-xl mx-auto px-5 sm:px-6 text-center">
            <div
              className="rounded-2xl bg-[#faf9f5] py-12 px-6"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-[#c96442] flex items-center justify-center mb-5">
                <svg
                  className="w-7 h-7 text-[#faf9f5]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <h1
                className="font-display text-[#141413] text-[32px] font-medium"
                style={{ lineHeight: 1.2 }}
              >
                {t('checkout.success.title')}
              </h1>
              <p
                className="text-[#5e5d59] text-[15px] mt-3 max-w-md mx-auto"
                style={{ lineHeight: 1.6 }}
              >
                {t('checkout.success.body')}
              </p>
              <div
                className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e8e6dc] text-[#4d4c48] text-[13px] font-medium"
              >
                <span className="font-display">#{submittedId.toUpperCase()}</span>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/orders"
                  className="bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
                >
                  {t('checkout.success.view_order')}
                </Link>
                <Link
                  href="/"
                  className="bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
                >
                  {t('checkout.empty.cta')}
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ─────────────────────────────────────────────
  // Main form
  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-32 lg:pb-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          {/* Page header */}
          <div className="mb-8">
            <div
              className="text-[10px] uppercase text-[#87867f] mb-3"
              style={{ letterSpacing: '0.5px' }}
            >
              {t('checkout.eyebrow')}
            </div>
            <h1
              className="font-display text-[#141413] text-[28px] sm:text-[35px] font-medium"
              style={{ lineHeight: 1.15 }}
            >
              {t('checkout.title')}
            </h1>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
            {/* LEFT — form */}
            <div className="space-y-4">
              <FormCard step="①" title={t('checkout.section.contact')}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label={t('checkout.field.name')} required>
                    <TextInput value={name} onChange={setName} />
                  </Field>
                  <Field label={t('checkout.field.phone')} required>
                    <TextInput value={phone} onChange={setPhone} type="tel" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t('checkout.field.email')}>
                      <TextInput value={email} onChange={setEmail} type="email" />
                    </Field>
                  </div>
                </div>
              </FormCard>

              <FormCard step="②" title={t('checkout.section.address')}>
                <div className="space-y-3">
                  <div>
                    <AddressAutocomplete
                      value={addressText}
                      onChangeText={(v) => {
                        setAddressText(v)
                        if (!v) setDestination(null)
                      }}
                      onSelect={onSelectAddress}
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
                      {locationError && (
                        <span className="text-[12px] text-[#b53333]">{locationError}</span>
                      )}
                    </div>
                  </div>

                  <Field label={t('checkout.field.address_apt')}>
                    <TextInput value={addressApt} onChange={setAddressApt} />
                  </Field>

                  {/* Map area */}
                  <div className="rounded-2xl overflow-hidden" style={{ minHeight: 300 }}>
                    {destination ? (
                      <div className="relative">
                        <div style={{ height: 300 }}>
                          <CheckoutMap
                            destination={destination}
                            routeGeometry={route?.geometry ?? null}
                          />
                        </div>
                        {/* Distance pill overlay */}
                        <div
                          className="absolute top-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f5] text-[13px]"
                          style={{ boxShadow: '0 0 0 1px #e8e6dc, 0 4px 24px rgba(0,0,0,0.05)' }}
                        >
                          {routing ? (
                            <span className="text-[#87867f]">{t('checkout.map.calculating')}</span>
                          ) : route ? (
                            <>
                              <span className="font-display font-medium text-[#c96442]">
                                {route.distanceKm.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km
                              </span>
                              <span className="text-[#87867f]">·</span>
                              <span className="text-[#5e5d59]">
                                {Math.round(route.durationMinutes)} {t('checkout.map.duration_min')}
                              </span>
                            </>
                          ) : (
                            <span className="text-[#87867f]">…</span>
                          )}
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

                  {outOfZone && (
                    <div
                      className="rounded-xl px-4 py-3 text-[13px]"
                      style={{
                        backgroundColor: '#fef3f2',
                        boxShadow: '0 0 0 1px #f4cdca',
                        color: '#b53333',
                      }}
                    >
                      {t('checkout.warning.out_of_zone').replace(
                        '{{km}}',
                        km!.toFixed(1).replace('.', locale === 'de' ? ',' : '.'),
                      )}
                    </div>
                  )}
                </div>
              </FormCard>

              <FormCard step="③" title={t('checkout.section.time')}>
                <div className="space-y-2">
                  <RadioCard
                    selected={time === 'now'}
                    onClick={() => setTime('now')}
                    title={t('checkout.time.now')}
                    desc={
                      route
                        ? `${t('checkout.time.now_eta')} · ${
                            DELIVERY.kitchenPrepMinutes + Math.round(route.durationMinutes)
                          } ${t('checkout.map.duration_min')}`
                        : `${DELIVERY.kitchenPrepMinutes}+ ${t('checkout.map.duration_min')}`
                    }
                  />
                  <RadioCard
                    selected={time === 'scheduled'}
                    onClick={() => setTime('scheduled')}
                    title={t('checkout.time.scheduled')}
                    desc={t('checkout.time.scheduled_help')}
                  >
                    {time === 'scheduled' && (
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="mt-3 w-full px-3 py-2 rounded-xl bg-white text-[#141413] text-[14px] outline-none"
                        style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                      />
                    )}
                  </RadioCard>
                </div>
              </FormCard>

              <FormCard step="④" title={t('checkout.section.payment')}>
                <div className="space-y-2">
                  <RadioCard
                    selected={payment === 'card'}
                    onClick={() => setPayment('card')}
                    title={t('checkout.payment.card')}
                    desc={t('checkout.payment.card_desc')}
                    iconType="card"
                  />
                  <RadioCard
                    selected={payment === 'paypal'}
                    onClick={() => setPayment('paypal')}
                    title={t('checkout.payment.paypal')}
                    desc={t('checkout.payment.paypal_desc')}
                    iconType="paypal"
                  />
                  <RadioCard
                    selected={payment === 'bank'}
                    onClick={() => setPayment('bank')}
                    title={t('checkout.payment.bank')}
                    desc={t('checkout.payment.bank_desc')}
                    iconType="bank"
                  >
                    {payment === 'bank' && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-[#faf9f5] px-3 py-2 text-[12px] text-[#5e5d59]" style={{ boxShadow: '0 0 0 1px #f0eee6' }}>
                        <svg className="w-3.5 h-3.5 text-[#c96442] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4M12 16h.01" />
                        </svg>
                        <span>{t('checkout.payment.bank_hint')}</span>
                      </div>
                    )}
                  </RadioCard>
                  <RadioCard
                    selected={payment === 'cash'}
                    onClick={() => setPayment('cash')}
                    title={t('checkout.payment.cash')}
                    desc={t('checkout.payment.cash_desc')}
                    iconType="cash"
                  />
                </div>
              </FormCard>

              <FormCard step="⑤" title={t('checkout.section.note')}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('checkout.field.note_placeholder')}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white text-[#141413] text-[14px] placeholder:text-[#87867f] outline-none resize-none"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc', lineHeight: 1.5 }}
                />
              </FormCard>
            </div>

            {/* RIGHT — summary (sticky) */}
            <section
              className="lg:sticky lg:top-32 self-start rounded-2xl bg-[#faf9f5] p-5 sm:p-6"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#e8e6dc] flex items-center justify-center text-[#4d4c48]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z" />
                      <path d="M4 6h16" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </span>
                  <h2
                    className="font-display text-[#141413] text-[18px] font-medium"
                    style={{ lineHeight: 1.2 }}
                  >
                    {t('checkout.summary.title')}
                  </h2>
                </div>

                {/* items */}
                <ul className="divide-y divide-[#f0eee6]">
                  {items.map((item) => (
                    <li key={item.cartId} className="flex items-center gap-3 py-2.5">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#e8e6dc] flex-shrink-0">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[#141413] font-medium leading-tight line-clamp-1">
                          {item.name}
                        </div>
                        <div className="text-[12px] text-[#87867f]">
                          × {item.quantity}
                          {item.variantLabel && ` · ${item.variantLabel}`}
                        </div>
                      </div>
                      <div className="text-[13px] text-[#141413] font-medium whitespace-nowrap">
                        {formatEuro(item.price * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* breakdown */}
                <div className="pt-4 mt-3 border-t border-[#f0eee6]">
                  <div className="space-y-1.5 text-[14px]">
                    <Row
                      label={t('checkout.summary.subtotal')}
                      value={formatEuro(subtotal)}
                    />
                    {km != null && (
                      <Row
                        label={t('checkout.summary.distance')}
                        value={`${km.toFixed(1).replace('.', locale === 'de' ? ',' : '.')} km`}
                        muted
                      />
                    )}
                    <Row
                      label={t('checkout.summary.shipping')}
                      value={
                        shipping == null
                          ? t('checkout.summary.shipping_pending')
                          : shipping === 0
                          ? t('checkout.summary.shipping_free')
                          : formatEuro(shipping)
                      }
                      accent={shipping === 0}
                    />
                  </div>

                  {/* free shipping progress */}
                  <div className="mt-4">
                    <div className="h-1 rounded-full bg-[#e8e6dc] overflow-hidden">
                      <div
                        className="h-full bg-[#c96442] transition-all duration-500"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#87867f] mt-1.5">
                      {freeShippingUnlocked
                        ? t('checkout.summary.free_shipping_unlocked')
                        : t('checkout.summary.free_shipping_progress').replace(
                            '{{amount}}',
                            formatEuro(Math.max(0, freeShippingDelta)),
                          )}
                    </div>
                  </div>
                </div>

                {/* total row */}
                <div
                  className="pt-4 mt-4 flex items-baseline justify-between border-t border-[#f0eee6]"
                >
                  <span className="font-display text-[#141413] text-[16px] font-medium">
                    {t('checkout.summary.total')}
                  </span>
                  <span className="font-display text-[#141413] text-[24px] font-medium">
                    {formatEuro(total)}
                  </span>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled={!requiredOk || submitting}
                  onClick={placeOrder}
                  className="mt-4 w-full bg-[#c96442] hover:bg-[#d97757] disabled:bg-[#e8e6dc] disabled:text-[#87867f] disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[15px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ boxShadow: requiredOk && !submitting ? '0 0 0 1px #c96442' : 'none' }}
                >
                  {submitting ? t('checkout.cta.placing_order') : t('checkout.cta.place_order')}
                  {!submitting && (
                    <span className="opacity-80">· {formatEuro(total)}</span>
                  )}
                </button>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

// ──────────────── helper components ────────────────

function FormCard({
  step,
  title,
  children,
}: {
  step: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl bg-[#faf9f5] p-5 sm:p-6"
      style={{ boxShadow: '0 0 0 1px #f0eee6' }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="font-display text-[14px] text-[#4d4c48] w-7 h-7 rounded-full bg-[#e8e6dc] flex items-center justify-center"
          style={{ lineHeight: 1 }}
        >
          {step}
        </span>
        <h2
          className="font-display text-[#141413] text-[18px] font-medium"
          style={{ lineHeight: 1.2 }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
  value,
  onChange,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  type?: string
}) {
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

function RadioCard({
  selected,
  onClick,
  title,
  desc,
  iconType,
  children,
}: {
  selected: boolean
  onClick: () => void
  title: string
  desc?: string
  iconType?: 'card' | 'paypal' | 'bank' | 'cash'
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
        selected ? 'bg-[#e8e6dc]' : 'bg-white hover:bg-[#f0eee6]'
      }`}
      style={{
        boxShadow: selected ? '0 0 0 2px #c96442' : '0 0 0 1px #e8e6dc',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
            selected ? 'border-[#c96442] bg-[#c96442]' : 'border-[#87867f] bg-transparent'
          }`}
          style={{
            boxShadow: selected ? 'inset 0 0 0 3px #faf9f5' : 'none',
          }}
        />
        {iconType && <PaymentIcon type={iconType} />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#141413] text-[14px] leading-tight">{title}</div>
          {desc && <div className="text-[12px] text-[#87867f] mt-0.5">{desc}</div>}
        </div>
      </div>
      {children}
    </button>
  )
}

function PaymentIcon({ type }: { type: 'card' | 'paypal' | 'bank' | 'cash' }) {
  if (type === 'card') {
    return (
      <svg className="w-5 h-5 text-[#5e5d59]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M2 11h20" />
      </svg>
    )
  }
  if (type === 'paypal') {
    return (
      <svg className="w-5 h-5 text-[#5e5d59]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 19h3l1-5h3a4 4 0 0 0 4-4 3 3 0 0 0-3-3H8L7 19z" />
        <path d="M5 21h3l3-15h4a3 3 0 0 1 3 3" />
      </svg>
    )
  }
  if (type === 'bank') {
    return (
      <svg className="w-5 h-5 text-[#5e5d59]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3M21 14v3M14 18v3M17 21h4M21 14h-4" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-[#5e5d59]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <circle cx="12" cy="13" r="2.5" />
      <path d="M6 13h.01M18 13h.01" />
    </svg>
  )
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string
  value: string
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-[#87867f]' : 'text-[#5e5d59]'}>{label}</span>
      <span
        className={
          accent
            ? 'text-[#c96442] font-medium'
            : muted
            ? 'text-[#87867f]'
            : 'text-[#141413]'
        }
      >
        {value}
      </span>
    </div>
  )
}
