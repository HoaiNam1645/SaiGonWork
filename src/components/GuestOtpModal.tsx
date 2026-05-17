'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

interface Props {
  email:    string
  /** Gọi khi verify OK + đã đặt order thành công ở caller, hoặc khi caller tự submit
   *  bằng token. Modal sẽ truyền guestToken (TTL 30 phút) qua. */
  onVerified: (guestToken: string) => Promise<void> | void
  onClose:   () => void
}

interface OtpSendResponse {
  ok:              boolean
  expiresAt:       string
  cooldownSeconds: number
}
interface OtpVerifyResponse {
  ok:         boolean
  guestToken: string
}

export default function GuestOtpModal({ email, onVerified, onClose }: Props) {
  const { t, locale } = useI18n()
  const [stage, setStage]       = useState<'send' | 'enter'>('send')
  const [code, setCode]         = useState('')
  const [sending, setSending]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const sentOnce = useRef(false)

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return
    const h = window.setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(h)
  }, [cooldown])

  async function send() {
    setSending(true)
    setError(null)
    try {
      const res = await api<OtpSendResponse>('/otp/send', {
        method: 'POST',
        body:   { email, purpose: 'guest_checkout' },
        locale,
      })
      sentOnce.current = true
      setCooldown(res.cooldownSeconds ?? 60)
      setStage('enter')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('checkout.error.generic'))
    } finally {
      setSending(false)
    }
  }

  async function verify() {
    if (code.length !== 6) return
    setVerifying(true)
    setError(null)
    try {
      const res = await api<OtpVerifyResponse>('/otp/verify', {
        method: 'POST',
        body:   { email, purpose: 'guest_checkout', code },
        locale,
      })
      await onVerified(res.guestToken)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#faf9f5] p-6 shadow-2xl">
        <div className="text-[10px] uppercase tracking-wide text-[#c96442] mb-2 font-medium">
          {t('checkout.otp.eyebrow')}
        </div>
        <h2 className="font-display text-[#141413] text-[22px] font-medium leading-tight">
          {t('checkout.otp.title')}
        </h2>
        <p className="text-[14px] text-[#5e5d59] mt-2" style={{ lineHeight: 1.5 }}>
          {t('checkout.otp.body').replace('{{email}}', email)}
        </p>

        {error && (
          <div
            className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px]"
            style={{ backgroundColor: '#fef3f2', boxShadow: '0 0 0 1px #f4cdca', color: '#b53333' }}
          >
            {error}
          </div>
        )}

        {stage === 'send' ? (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
            >
              {t('checkout.otp.cancel')}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="flex-1 bg-[#c96442] hover:bg-[#d97757] disabled:opacity-60 text-[#faf9f5] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
            >
              {sending ? t('checkout.otp.sending') : t('checkout.otp.send')}
            </button>
          </div>
        ) : (
          <>
            <label className="block mt-5">
              <span className="block text-[10px] uppercase tracking-wide text-[#87867f] font-medium mb-1.5">
                {t('checkout.otp.code_label')}
              </span>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                className="w-full px-3.5 py-3 rounded-xl bg-white text-[#141413] text-[20px] tracking-[0.5em] text-center font-mono outline-none"
                style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
              />
            </label>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={send}
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
                onClick={onClose}
                className="flex-1 bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
              >
                {t('checkout.otp.cancel')}
              </button>
              <button
                type="button"
                onClick={verify}
                disabled={verifying || code.length !== 6}
                className="flex-1 bg-[#c96442] hover:bg-[#d97757] disabled:opacity-60 disabled:cursor-not-allowed text-[#faf9f5] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
              >
                {verifying ? t('checkout.otp.verifying') : t('checkout.otp.verify')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
