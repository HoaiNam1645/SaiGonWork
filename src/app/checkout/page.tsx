'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import SavedAddressPicker, { type SavedAddress } from '@/components/SavedAddressPicker'
import GuestOtpModal from '@/components/GuestOtpModal'
import BankTransferModal from '@/components/BankTransferModal'
import PromoCodeInput, { type AppliedPromo } from '@/components/PromoCodeInput'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import { saveOrderToken } from '@/lib/guestToken'
import { useStoreSettings } from '@/lib/storeApi'
import {
  computeShipping,
  fetchRoute,
  formatEuro,
  formatNominatim,
  reverseGeocode,
  searchAddress,
  type LatLng,
  type NominatimResult,
  type RouteResult,
  type ShippingConfig,
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

// MVP: chỉ enable bank_qr_image. Cash + PayPal giữ trong DB cho V2.
type PaymentMethod = 'bank'

type ApiPaymentMethod = 'cash_on_delivery' | 'paypal' | 'bank_qr_image'
const PAYMENT_API_MAP: Record<PaymentMethod, ApiPaymentMethod> = {
  bank: 'bank_qr_image',
}

interface CreateOrderResponse {
  order: { code: string }
  paymentInstructions: unknown
  guestToken?: string
}

export default function CheckoutPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const { items, total: subtotal, clearCart } = useCart()
  const { store, loading: storeLoading, error: storeError } = useStoreSettings()

  // Form state
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [addressText, setAddressText] = useState('')
  const [addressApt,  setAddressApt]  = useState('')
  const [city,        setCity]        = useState('Stuttgart')
  const [postalCode,  setPostalCode]  = useState('')
  const [destination, setDestination] = useState<LatLng | null>(null)
  const [savedAddrId, setSavedAddrId] = useState<string | null>(null)

  const payment: PaymentMethod = 'bank'  // MVP: locked
  const [note, setNote] = useState('')

  // Promotion state — preview, BE recompute lúc submit
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)

  // Location state
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Route state
  const [route,    setRoute]    = useState<RouteResult | null>(null)
  const [routing,  setRouting]  = useState(false)
  const routeAbortRef = useRef<AbortController | null>(null)

  // Submit state
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showOtp,     setShowOtp]     = useState(false)
  const [showBank,    setShowBank]    = useState(false)
  // Mã giao dịch khách nhập trong BankTransferModal — gửi kèm khi tạo order.
  const [bankTxId,    setBankTxId]    = useState<string | null>(null)

  // ─── Prefill từ user khi login ───
  useEffect(() => {
    if (!user) return
    setName(prev  => prev  || user.fullName)
    setEmail(prev => prev  || user.email)
    setPhone(prev => prev  || (user.phone ?? ''))
  }, [user])

  // Khi user gõ edit trên field địa chỉ sau khi đã pick saved address → unbind
  // savedAddrId để FE gửi inline address mới thay vì address_id (tránh BE silently
  // ignore edits của user).
  function unbindSavedIfNeeded() {
    if (savedAddrId) setSavedAddrId(null)
  }
  const editAddressLine = (v: string) => { setAddressApt(v);  unbindSavedIfNeeded() }
  const editCity        = (v: string) => { setCity(v);        unbindSavedIfNeeded() }
  const editPostal      = (v: string) => { setPostalCode(v);  unbindSavedIfNeeded() }

  // Cấu hình tính ship — bắt nguồn từ store_settings (BE), KHÔNG hardcode.
  const shippingConfig: ShippingConfig | null = store
    ? {
        perKm:             store.delivery.perKm             ?? 0,
        freeShipThreshold: store.delivery.freeShipThreshold ?? null,
        baseFee:           store.delivery.baseFee           ?? 0,
      }
    : null
  const maxRadiusKm   = store?.delivery.radiusKm           ?? null
  const freeThreshold = store?.delivery.freeShipThreshold  ?? null

  // Compute shipping (preview client-side; BE sẽ recompute từ DB lúc submit)
  const km = route?.distanceKm ?? null
  const shipping = useMemo(
    () => computeShipping(km, subtotal, shippingConfig),
    // shippingConfig là object mới mỗi render — depend vào primitives bên trong
    // để không trigger re-compute liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [km, subtotal, shippingConfig?.perKm, shippingConfig?.freeShipThreshold, shippingConfig?.baseFee],
  )
  const effectiveShipping = appliedPromo?.shippingAfter ?? shipping
  const discountAmount    = appliedPromo?.discount ?? 0
  const total = subtotal + (effectiveShipping ?? 0) - discountAmount
  const outOfZone =
    km != null && maxRadiusKm != null && km > maxRadiusKm
  const freeShippingDelta    = freeThreshold != null ? freeThreshold - subtotal : 0
  const freeShippingUnlocked = freeThreshold != null && subtotal >= freeThreshold
  const freeShippingProgress = freeThreshold != null
    ? Math.min(100, (subtotal / freeThreshold) * 100)
    : 0

  // Fetch route khi destination đổi (cần store coords để gọi OSRM)
  useEffect(() => {
    if (!destination || !store?.lat || !store?.lng) {
      setRoute(null)
      return
    }
    if (routeAbortRef.current) routeAbortRef.current.abort()
    const ctrl = new AbortController()
    routeAbortRef.current = ctrl
    setRouting(true)
    fetchRoute({ lat: store.lat, lng: store.lng }, destination, ctrl.signal).then(r => {
      if (ctrl.signal.aborted) return
      setRoute(r)
      setRouting(false)
    })
    return () => { ctrl.abort() }
  }, [destination, store?.lat, store?.lng])

  function onSelectAutocomplete(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestination({ lat, lng })
      setLocationError(null)
      // Auto-fill postal/city từ Nominatim address details nếu có
      const a = r.address ?? {}
      if (a.postcode) setPostalCode(a.postcode)
      const ct = a.city ?? a.town ?? a.village ?? a.suburb
      if (ct) setCity(ct)
    }
    setSavedAddrId(null)
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
          const a = reverse.address ?? {}
          if (a.postcode) setPostalCode(a.postcode)
          const ct = a.city ?? a.town ?? a.village ?? a.suburb
          if (ct) setCity(ct)
        }
        setLocating(false)
        setSavedAddrId(null)
      },
      () => {
        setLocating(false)
        setLocationError(t('checkout.location_error'))
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  const [geocodingSaved, setGeocodingSaved] = useState(false)

  async function onUseSavedAddress(a: SavedAddress) {
    setSavedAddrId(a.id)
    setName(a.recipient)
    setPhone(a.phone)
    setAddressText(a.line)
    setCity(a.city)
    setPostalCode(a.postalCode ?? '')
    if (a.lat != null && a.lng != null) {
      setDestination({ lat: a.lat, lng: a.lng })
      return
    }
    // Saved address chưa có lat/lng (vd address legacy) → forward geocode để hiển thị
    // map + tính ship preview. BE cũng sẽ geocode khi submit, nhưng FE cần để preview.
    setGeocodingSaved(true)
    const query = [a.line, a.postalCode, a.city, a.country].filter(Boolean).join(', ')
    try {
      const results = await searchAddress(query)
      const hit = results[0]
      if (hit) {
        const lat = parseFloat(hit.lat)
        const lng = parseFloat(hit.lon)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setDestination({ lat, lng })
        } else {
          setDestination(null)
        }
      } else {
        setDestination(null)
      }
    } catch {
      setDestination(null)
    } finally {
      setGeocodingSaved(false)
    }
  }

  // Khi pick saved address mà chưa có lat/lng (vd address tạo từ register flow chưa
  // bổ sung tọa độ), không bắt buộc destination ở FE — BE sẽ tự geocode từ address_id.
  const locationOk = destination != null || savedAddrId != null

  // Customer login phải verify email mới đặt được đơn (khớp luồng guest).
  const needEmailVerify = !!user && !user.emailVerifiedAt

  const requiredOk =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    addressText.trim().length > 0 &&
    locationOk &&
    !outOfZone &&
    items.length > 0 &&
    !needEmailVerify

  // ─── Build payload chung ───
  function buildOrderBody(bankTxIdArg?: string | null) {
    const itemsWithIds = items.filter(i => i.dishId)
    if (itemsWithIds.length === 0) {
      throw new Error(t('checkout.error.cart_empty'))
    }
    return {
      contact_name:  name.trim(),
      contact_email: email.trim().toLowerCase(),
      contact_phone: phone.trim(),
      address_id:    savedAddrId ?? undefined,
      address:       savedAddrId
        ? undefined
        : {
            recipient:   name.trim(),
            phone:       phone.trim(),
            line:        [addressText.trim(), addressApt.trim()].filter(Boolean).join(', '),
            city:        city.trim(),
            country:     'DE',
            postal_code: postalCode.trim() || undefined,
            lat:         destination?.lat,
            lng:         destination?.lng,
          },
      items: itemsWithIds.map(i => ({
        dish_id:  i.dishId!,
        quantity: i.quantity,
        options:  i.optionId && i.valueId
          ? [{ option_id: i.optionId, value_id: i.valueId }]
          : [],
        note:     i.note || undefined,
      })),
      payment_method: PAYMENT_API_MAP[payment],
      bank_tx_id:     (bankTxIdArg ?? bankTxId ?? undefined) || undefined,
      customer_note:  note.trim() || undefined,
      promotion_code: appliedPromo?.code,
    }
  }

  function mapErrorToMessage(e: unknown): string {
    if (!(e instanceof ApiError)) return e instanceof Error ? e.message : t('checkout.error.generic')
    switch (e.code) {
      case 'OUT_OF_ZONE':       return t('checkout.warning.out_of_zone')
                                  .replace('{{km}}',     String(e.vars?.distance_km ?? km ?? ''))
                                  .replace('{{radius}}', String(e.vars?.radius_km ?? maxRadiusKm ?? ''))
      case 'STORE_CLOSED':      return t('checkout.error.store_closed')
      case 'ROUTING_FAILED':    return t('checkout.error.routing_failed')
      case 'GEOCODE_FAILED':    return t('checkout.error.routing_failed')
      case 'DISH_UNAVAILABLE':  return t('checkout.error.dish_unavailable')
      case 'PROMO_EXPIRED':
      case 'PROMO_USAGE_LIMIT':
      case 'PROMO_PER_USER_LIMIT':
      case 'PROMO_MIN_ORDER':
        // BE đã trả message i18n — và nếu code không hợp lệ nữa thì clear preview
        setAppliedPromo(null)
        return e.message || t('checkout.error.generic')
      default:                  return e.message || t('checkout.error.generic')
    }
  }

  async function submitCustomer(tx?: string | null) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = buildOrderBody(tx)
      const res = await api<CreateOrderResponse>('/orders', {
        method: 'POST',
        body,
        locale,
      })
      setShowBank(false)
      await clearCart()
      router.push(`/orders/${res.order.code}`)
    } catch (e) {
      setSubmitError(mapErrorToMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitWithGuestToken(token: string) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = buildOrderBody()
      const res = await api<CreateOrderResponse>('/orders', {
        method: 'POST',
        body,
        guestToken: token,
        locale,
      })
      setShowBank(false)
      // Guest: lưu permanent token để tra cứu sau
      if (res.guestToken) saveOrderToken(res.order.code, res.guestToken)
      await clearCart()
      setShowOtp(false)
      router.push(`/orders/${res.order.code}?token=${encodeURIComponent(res.guestToken ?? '')}`)
    } catch (e) {
      setSubmitError(mapErrorToMessage(e))
      setShowOtp(false)
    } finally {
      setSubmitting(false)
    }
  }

  function placeOrder() {
    if (!requiredOk) return
    setSubmitError(null)
    // Payment là bank_qr_image → mở popup QR + nhập mã giao dịch trước.
    if (payment === 'bank') {
      setBankTxId(null)
      setShowBank(true)
      return
    }
    // (Các payment method khác trong tương lai vẫn dùng flow cũ.)
    if (user) {
      void submitCustomer()
    } else {
      setShowOtp(true)
    }
  }

  // Gọi từ BankTransferModal khi khách bấm "Xác nhận" sau khi nhập mã giao dịch.
  function onBankConfirmed(tx: string) {
    setBankTxId(tx)
    setSubmitError(null)
    if (user) {
      void submitCustomer(tx)
    } else {
      // Guest: đóng bank modal, mở OTP — submitWithGuestToken sẽ đọc bankTxId từ state.
      setShowBank(false)
      setShowOtp(true)
    }
  }

  // ─────────────────────────────────────────────
  // Loading store settings (BE source of truth)
  if (storeLoading) {
    return (
      <>
        <Header />
        <main className="menu-page-bg min-h-screen pt-32 pb-24 text-center text-[#87867f] text-[14px]">
          …
        </main>
        <Footer />
      </>
    )
  }
  if (storeError || !store) {
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
                className="font-display text-[#141413] text-[20px] font-medium"
                style={{ lineHeight: 1.3 }}
              >
                {t('checkout.error.generic')}
              </h1>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ─────────────────────────────────────────────
  // Empty cart fallback
  if (items.length === 0) {
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
  // Main form
  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-32 lg:pb-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
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
                    <Field label={t('checkout.field.email')} required>
                      <TextInput value={email} onChange={setEmail} type="email" />
                    </Field>
                  </div>
                </div>
              </FormCard>

              <FormCard step="②" title={t('checkout.section.address')}>
                <div className="space-y-3">
                  {user ? (
                    // Customer login: chỉ chọn từ saved addresses (auto pick default)
                    <SavedAddressPicker
                      selectedId={savedAddrId}
                      onSelect={onUseSavedAddress}
                    />
                  ) : (
                    // Guest: nhập inline (chưa có saved addresses)
                    <>
                      <div>
                        <AddressAutocomplete
                          value={addressText}
                          onChangeText={(v) => {
                            setAddressText(v)
                            if (!v) setDestination(null)
                          }}
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
                          {locationError && (
                            <span className="text-[12px] text-[#b53333]">{locationError}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <Field label={t('checkout.field.address_apt')}>
                          <TextInput value={addressApt} onChange={editAddressLine} />
                        </Field>
                        <Field label="PLZ">
                          <TextInput value={postalCode} onChange={editPostal} />
                        </Field>
                        <Field label="Stadt">
                          <TextInput value={city} onChange={editCity} />
                        </Field>
                      </div>
                    </>
                  )}

                  {/* Map (chia sẻ cho cả 2 nhánh) */}
                  <div className="rounded-2xl overflow-hidden" style={{ minHeight: 300 }}>
                    {destination && store?.lat != null && store?.lng != null ? (
                      <div className="relative">
                        <div style={{ height: 300 }}>
                          <CheckoutMap
                            origin={{
                              lat:     store.lat,
                              lng:     store.lng,
                              name:    store.name,
                              address: store.address,
                            }}
                            destination={destination}
                            routeGeometry={route?.geometry ?? null}
                          />
                        </div>
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
                    ) : geocodingSaved ? (
                      <div
                        className="rounded-2xl bg-[#e8e6dc]/60 border-2 border-dashed border-[#e8e6dc] flex items-center justify-center text-center px-6"
                        style={{ minHeight: 240 }}
                      >
                        <div className="text-[13px] text-[#5e5d59]">
                          {t('checkout.saved_addresses.locating')}
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
                      {t('checkout.warning.out_of_zone')
                        .replace('{{km}}',     km!.toFixed(1).replace('.', locale === 'de' ? ',' : '.'))
                        .replace('{{radius}}', String(maxRadiusKm ?? ''))}
                    </div>
                  )}
                </div>
              </FormCard>

              {/* Payment: chỉ bank QR cho MVP */}
              <FormCard step="③" title={t('checkout.section.payment')}>
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#e8e6dc', boxShadow: '0 0 0 2px #c96442' }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 border-[#c96442] bg-[#c96442]"
                      style={{ boxShadow: 'inset 0 0 0 3px #faf9f5' }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-[#141413] text-[14px] leading-tight">
                        {t('checkout.payment.bank')}
                      </div>
                      <div className="text-[12px] text-[#87867f] mt-0.5">
                        {t('checkout.payment.bank_desc')}
                      </div>
                      <div
                        className="mt-3 flex items-start gap-2.5 rounded-lg bg-[#faf9f5] px-3 py-2 text-[12px] text-[#5e5d59]"
                        style={{ boxShadow: '0 0 0 1px #f0eee6' }}
                      >
                        <svg className="w-3.5 h-3.5 text-[#c96442] mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4M12 16h.01" />
                        </svg>
                        <span>{t('checkout.payment.bank_hint')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FormCard>

              <FormCard step="④" title={t('checkout.section.note')}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('checkout.field.note_placeholder')}
                  rows={3}
                  maxLength={500}
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
                <h2 className="font-display text-[#141413] text-[18px] font-medium" style={{ lineHeight: 1.2 }}>
                  {t('checkout.summary.title')}
                </h2>
              </div>

              <ul className="divide-y divide-[#f0eee6]">
                {items.map((item) => (
                  <li key={item.cartId} className="flex items-center gap-3 py-2.5">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#e8e6dc] flex-shrink-0">
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
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

              <div className="pt-4 mt-3 border-t border-[#f0eee6]">
                <div className="space-y-1.5 text-[14px]">
                  <Row label={t('checkout.summary.subtotal')} value={formatEuro(subtotal)} />
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
                      effectiveShipping == null
                        ? t('checkout.summary.shipping_pending')
                        : effectiveShipping === 0
                        ? t('checkout.summary.shipping_free')
                        : formatEuro(effectiveShipping)
                    }
                    accent={effectiveShipping === 0}
                  />
                  {discountAmount > 0 && (
                    <Row
                      label={`${t('checkout.summary.discount')}${appliedPromo ? ` (${appliedPromo.code})` : ''}`}
                      value={`-${formatEuro(discountAmount)}`}
                      accent
                    />
                  )}
                  {/* Formula transparency (E): khách nhìn rõ vì sao có phí này */}
                  {shipping != null && km != null && shippingConfig && (
                    <div className="text-[11px] text-[#87867f]" style={{ lineHeight: 1.5 }}>
                      {shipping === 0 && freeThreshold != null
                        ? t('checkout.summary.shipping_free_reason')
                            .replace('{{threshold}}', formatEuro(freeThreshold))
                        : t('checkout.summary.shipping_formula')
                            .replace('{{km}}',   km.toFixed(1).replace('.', locale === 'de' ? ',' : '.'))
                            .replace('{{perKm}}', shippingConfig.perKm.toString().replace('.', locale === 'de' ? ',' : '.'))}
                    </div>
                  )}
                </div>

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

              <div className="pt-4 mt-4 border-t border-[#f0eee6]">
                <PromoCodeInput
                  subtotal={subtotal}
                  deliveryFee={shipping ?? 0}
                  applied={appliedPromo}
                  onApply={setAppliedPromo}
                  onClear={() => setAppliedPromo(null)}
                />
              </div>

              <div className="pt-4 mt-4 flex items-baseline justify-between border-t border-[#f0eee6]">
                <span className="font-display text-[#141413] text-[16px] font-medium">
                  {t('checkout.summary.total')}
                </span>
                <span className="font-display text-[#141413] text-[24px] font-medium">
                  {formatEuro(total)}
                </span>
              </div>

              {submitError && (
                <div
                  className="mt-3 rounded-xl px-3.5 py-2.5 text-[13px]"
                  style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
                >
                  {submitError}
                </div>
              )}

              {needEmailVerify && user && (
                <div
                  className="mt-4 rounded-xl px-3.5 py-3 text-[13px]"
                  style={{ backgroundColor: '#fff7ed', boxShadow: '0 0 0 1px #fed7aa', color: '#9a3412' }}
                >
                  <div className="font-medium mb-1">{t('checkout.verify_required.title')}</div>
                  <div className="text-[12px] leading-relaxed mb-2">
                    {t('checkout.verify_required.body').replace('{{email}}', user.email)}
                  </div>
                  <Link
                    href={`/auth/verify?email=${encodeURIComponent(user.email)}&purpose=register`}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#c96442] hover:text-[#d97757] transition-colors"
                  >
                    {t('checkout.verify_required.cta')} →
                  </Link>
                </div>
              )}

              <button
                type="button"
                disabled={!requiredOk || submitting}
                onClick={placeOrder}
                className="mt-4 w-full bg-[#c96442] hover:bg-[#d97757] disabled:bg-[#e8e6dc] disabled:text-[#87867f] disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[15px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                style={{ boxShadow: requiredOk && !submitting ? '0 0 0 1px #c96442' : 'none' }}
              >
                {submitting ? t('checkout.cta.placing_order') : t('checkout.cta.place_order')}
                {!submitting && (<span className="opacity-80">· {formatEuro(total)}</span>)}
              </button>
            </section>
          </div>
        </div>
      </main>
      <Footer />

      {showOtp && !user && (
        <GuestOtpModal
          email={email.trim().toLowerCase()}
          onVerified={async (token) => {
            await submitWithGuestToken(token)
          }}
          onClose={() => setShowOtp(false)}
        />
      )}

      {showBank && store && (
        <BankTransferModal
          store={store}
          amount={total}
          reference={email.trim().toLowerCase() || undefined}
          submitting={submitting}
          errorText={submitError}
          onConfirm={onBankConfirmed}
          onClose={() => { if (!submitting) setShowBank(false) }}
        />
      )}
    </>
  )
}

// ──────────────── helper components (unchanged) ────────────────

function FormCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
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
        <h2 className="font-display text-[#141413] text-[18px] font-medium" style={{ lineHeight: 1.2 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

function Row({
  label, value, muted, accent,
}: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-[#87867f]' : 'text-[#5e5d59]'}>{label}</span>
      <span
        className={
          accent ? 'text-[#c96442] font-medium' :
          muted  ? 'text-[#87867f]' :
                   'text-[#141413]'
        }
      >
        {value}
      </span>
    </div>
  )
}
