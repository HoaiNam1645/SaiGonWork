'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

export interface AppliedPromo {
  code:          string
  type:          'percent' | 'fixed' | 'free_ship'
  discount:      number
  /** Phí ship sau khi áp promo (= 0 nếu free_ship). null = không thay đổi. */
  shippingAfter: number | null
}

interface PreviewResponse {
  promotion: AppliedPromo
}

interface Props {
  subtotal:    number
  deliveryFee: number
  applied:     AppliedPromo | null
  onApply:     (p: AppliedPromo) => void
  onClear:     () => void
}

export default function PromoCodeInput({
  subtotal, deliveryFee, applied, onApply, onClear,
}: Props) {
  const { t, locale } = useI18n()
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function apply() {
    const c = code.trim()
    if (!c) return
    setLoading(true); setError(null)
    try {
      const res = await api<PreviewResponse>('/orders/promo/preview', {
        method: 'POST',
        body:   { code: c, subtotal, deliveryFee },
        locale,
      })
      onApply(res.promotion)
      setCode('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('checkout.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (applied) {
    return (
      <div
        className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
        style={{ backgroundColor: '#eaf6ec', boxShadow: '0 0 0 1px #c5e3cb' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#1a7d3a] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="font-mono text-[13px] font-semibold text-[#1a7d3a] truncate">
              {applied.code}
            </span>
          </div>
          <div className="text-[11px] text-[#5e5d59] mt-0.5">
            {applied.type === 'free_ship'
              ? t('checkout.promo.free_ship_applied')
              : t('checkout.promo.discount_applied').replace(
                  '{{amount}}',
                  `${applied.discount.toFixed(2).replace('.', ',')} €`,
                )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] text-[#5e5d59] hover:text-[#141413] transition-colors shrink-0"
        >
          {t('checkout.promo.remove')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void apply() } }}
          placeholder={t('checkout.promo.placeholder')}
          maxLength={50}
          className="flex-1 px-3 py-2 rounded-lg bg-white text-[#141413] text-[14px] font-mono uppercase outline-none"
          style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
        />
        <button
          type="button"
          onClick={apply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-lg bg-[#141413] hover:bg-[#000] text-[#faf9f5] text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '…' : t('checkout.promo.apply')}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-[12px] text-[#b53333]">{error}</div>
      )}
    </div>
  )
}
