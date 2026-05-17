'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import {
  saveLookupSession,
  readLookupToken,
  readLookupEmail,
  clearLookupSession,
} from '@/lib/lookupToken'

// =====================================================================
// Types
// =====================================================================

interface OrderItem {
  id: string; dishName: string; quantity: number; lineTotal: number
}

interface LookupOrder {
  id:           string
  code:         string
  contactName:  string
  contactEmail: string
  status:       string
  total:        number
  currency:     string
  createdAt:    string
  items:        OrderItem[]
}

interface OtpSendResponse  { ok: boolean; cooldownSeconds: number; expiresAt: string }
interface OtpVerifyResponse { ok: boolean; lookupToken: string }
interface ListResponse      { orders: LookupOrder[] }
interface CheckResponse     { hasOrders: boolean }

// =====================================================================
// Page
// =====================================================================

export default function OrderLookupPage() {
  const { t, locale } = useI18n()

  // Nếu sessionStorage còn token (cùng tab) → vào thẳng list
  const [stage,  setStage]  = useState<'email' | 'otp' | 'list' | 'empty'>('email')
  const [email,  setEmail]  = useState('')
  const [code,   setCode]   = useState('')
  const [error,  setError]  = useState<string | null>(null)
  const [sending,   setSending]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [cooldown,  setCooldown]  = useState(0)
  const [orders,    setOrders]    = useState<LookupOrder[] | null>(null)

  // Restore session on mount
  useEffect(() => {
    const tok = readLookupToken()
    const em  = readLookupEmail()
    if (tok && em) {
      setEmail(em)
      setStage('list')
      void fetchOrders(tok)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return
    const h = window.setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(h)
  }, [cooldown])

  /** Bước 1: precheck email có đơn không. Nếu không → hiện thẳng empty, không
   *  gửi OTP để khỏi làm guest đợi 1 phút rồi nhận thông báo "không có đơn". */
  async function sendOtp() {
    const em = email.trim().toLowerCase()
    if (!em) return
    setSending(true); setError(null)
    try {
      // Khi resend (đã ở stage otp) thì bỏ qua precheck — đã check rồi.
      if (stage !== 'otp') {
        const check = await api<CheckResponse>('/orders/lookup/check', {
          method: 'POST',
          body:   { email: em },
          locale,
        })
        if (!check.hasOrders) {
          setEmail(em)
          setStage('empty')
          return
        }
      }
      const res = await api<OtpSendResponse>('/otp/send', {
        method: 'POST',
        body:   { email: em, purpose: 'order_lookup' },
        locale,
      })
      setCooldown(res.cooldownSeconds ?? 60)
      setStage('otp')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('checkout.error.generic'))
    } finally {
      setSending(false)
    }
  }

  async function verifyOtp() {
    if (code.length !== 6) return
    setVerifying(true); setError(null)
    try {
      const res = await api<OtpVerifyResponse>('/otp/verify', {
        method: 'POST',
        body:   { email: email.trim().toLowerCase(), purpose: 'order_lookup', code },
        locale,
      })
      saveLookupSession(email.trim().toLowerCase(), res.lookupToken)
      setStage('list')
      await fetchOrders(res.lookupToken)
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'OTP_EXPIRED')      setError(t('checkout.otp.error_expired'))
        else if (e.code === 'OTP_INVALID') setError(t('checkout.otp.error_invalid'))
        else                                setError(e.message)
      } else {
        setError(t('checkout.error.generic'))
      }
    } finally {
      setVerifying(false)
    }
  }

  async function fetchOrders(token: string) {
    setLoading(true); setError(null)
    try {
      const res = await api<ListResponse>('/orders/lookup', { lookupToken: token, locale })
      setOrders(res.orders)
    } catch (e) {
      // Token hết hạn → buộc verify lại
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        clearLookupSession()
        setOrders(null)
        setStage('email')
        setError(t('lookup.error.session_expired'))
      } else {
        setError(e instanceof ApiError ? e.message : t('checkout.error.generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    clearLookupSession()
    setOrders(null)
    setEmail('')
    setCode('')
    setStage('email')
  }

  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-[10px] uppercase tracking-wide text-[#c96442] mb-2 font-medium">
            {t('lookup.eyebrow')}
          </div>
          <h1 className="font-display text-[#141413] text-[28px] sm:text-[32px] font-medium leading-tight">
            {t('lookup.title')}
          </h1>
          <p className="text-[15px] text-[#5e5d59] mt-2 leading-relaxed">
            {t('lookup.subtitle')}
          </p>

          {error && (
            <div
              className="mt-5 rounded-xl px-3.5 py-2.5 text-[13px]"
              style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
            >
              {error}
            </div>
          )}

          {/* ------ STAGE: EMAIL ------ */}
          {stage === 'email' && (
            <div className="mt-6 rounded-2xl bg-[#faf9f5] p-6">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wide text-[#87867f] font-medium mb-1.5">
                  {t('lookup.email_label')}
                </span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void sendOtp() }}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-3 rounded-xl bg-white text-[#141413] text-[15px] outline-none"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                  autoFocus
                />
              </label>
              <p className="mt-2 text-[12px] text-[#87867f]">{t('lookup.email_hint')}</p>

              <button
                type="button"
                onClick={sendOtp}
                disabled={sending || !email.trim()}
                className="mt-5 w-full bg-[#c96442] hover:bg-[#d97757] disabled:opacity-60 disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[14px] py-3 rounded-xl transition-colors"
              >
                {sending ? t('checkout.otp.sending') : t('lookup.send_code')}
              </button>
            </div>
          )}

          {/* ------ STAGE: EMPTY (no orders for this email) ------ */}
          {stage === 'empty' && (
            <div className="mt-6 rounded-2xl bg-[#faf9f5] p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#fef3f2] mb-3">
                <svg className="w-6 h-6 text-[#c96442]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 9h.01M15 9h.01M8 15h8" />
                </svg>
              </div>
              <h2 className="font-display text-[#141413] text-[20px] font-medium leading-tight">
                {t('lookup.empty_title')}
              </h2>
              <p className="text-[13px] text-[#5e5d59] mt-2">
                {t('lookup.empty_body').replace('{{email}}', email)}
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => { setStage('email'); setError(null) }}
                  className="bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
                >
                  {t('lookup.empty.try_again')}
                </button>
                <Link
                  href="/menu"
                  className="bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
                >
                  {t('lookup.go_menu')}
                </Link>
              </div>
            </div>
          )}

          {/* ------ STAGE: OTP ------ */}
          {stage === 'otp' && (
            <div className="mt-6 rounded-2xl bg-[#faf9f5] p-6">
              <p className="text-[14px] text-[#5e5d59]">
                {t('checkout.otp.body').replace('{{email}}', email)}
              </p>

              <label className="block mt-5">
                <span className="block text-[10px] uppercase tracking-wide text-[#87867f] font-medium mb-1.5">
                  {t('checkout.otp.code_label')}
                </span>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => { if (e.key === 'Enter') void verifyOtp() }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="w-full px-3.5 py-3 rounded-xl bg-white text-[#141413] text-[20px] tracking-[0.5em] text-center font-mono outline-none"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                  autoFocus
                />
              </label>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sending || cooldown > 0}
                  className="text-[12px] text-[#c96442] hover:text-[#d97757] disabled:text-[#87867f] disabled:cursor-not-allowed transition-colors"
                >
                  {cooldown > 0
                    ? t('checkout.otp.resend_cooldown').replace('{{seconds}}', String(cooldown))
                    : t('checkout.otp.resend')}
                </button>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStage('email'); setCode(''); setError(null) }}
                  className="flex-1 bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
                >
                  {t('checkout.otp.cancel')}
                </button>
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={verifying || code.length !== 6}
                  className="flex-1 bg-[#c96442] hover:bg-[#d97757] disabled:opacity-60 disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
                >
                  {verifying ? t('checkout.otp.verifying') : t('checkout.otp.verify')}
                </button>
              </div>
            </div>
          )}

          {/* ------ STAGE: LIST ------ */}
          {stage === 'list' && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[13px] text-[#5e5d59]">
                  {t('lookup.signed_in_as').replace('{{email}}', email)}
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-[12px] text-[#c96442] hover:text-[#d97757] transition-colors"
                >
                  {t('lookup.use_different_email')}
                </button>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-[#faf9f5] py-12 text-center text-[#87867f] text-[14px]">
                  {t('order_detail.loading')}
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="rounded-2xl bg-[#faf9f5] py-12 text-center">
                  <p className="text-[14px] text-[#5e5d59]">{t('lookup.empty')}</p>
                  <Link
                    href="/menu"
                    className="inline-flex items-center gap-2 mt-5 bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] px-5 py-2.5 rounded-xl transition-colors"
                  >
                    {t('lookup.go_menu')}
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.map(o => (
                    <OrderRow key={o.id} order={o} locale={locale} t={t} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

// =====================================================================
// Row
// =====================================================================

function OrderRow({ order, locale, t }: {
  order: LookupOrder; locale: string; t: (k: string) => string
}) {
  const created = new Date(order.createdAt).toLocaleString(
    locale === 'de' ? 'de-DE' : 'en-GB',
    { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  )
  const itemsPreview = order.items.slice(0, 2).map(i => `${i.quantity}× ${i.dishName}`).join(' · ')
  const more = order.items.length > 2 ? ` +${order.items.length - 2}` : ''

  return (
    <li>
      <Link
        href={`/orders/${encodeURIComponent(order.code)}`}
        className="block rounded-2xl bg-[#faf9f5] hover:bg-[#f5f4ed] transition-colors p-5"
        style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-[#141413] text-[18px] font-medium">{order.code}</span>
              <StatusChip status={order.status} t={t} />
            </div>
            <div className="text-[12px] text-[#87867f] mt-1 tabular-nums">{created}</div>
            <div className="text-[13px] text-[#5e5d59] mt-2 truncate">
              {itemsPreview}{more}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[18px] font-medium text-[#141413] tabular-nums">
              {formatEuro(order.total, locale)}
            </div>
            <div className="inline-flex items-center gap-1 text-[12px] text-[#c96442] mt-1.5">
              {t('lookup.view_detail')}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </li>
  )
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending_payment: { bg: '#fff4e5', fg: '#b06a14' },
  paid:            { bg: '#eaf6ec', fg: '#1a7d3a' },
  preparing:       { bg: '#fbe9df', fg: '#c96442' },
  delivering:      { bg: '#fbe9df', fg: '#c96442' },
  completed:       { bg: '#e8e6dc', fg: '#4d4c48' },
  cancelled:       { bg: '#fef3f2', fg: '#b53333' },
}

function StatusChip({ status, t }: { status: string; t: (k: string) => string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#e8e6dc', fg: '#4d4c48' }
  return (
    <span
      className="inline-flex items-center text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.fg }}
    >
      {t(`admin.status.${status}`)}
    </span>
  )
}

function formatEuro(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency', currency: 'EUR',
  }).format(n)
}
