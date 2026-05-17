'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import AuthButton from '@/components/auth/AuthButton'
import OtpInput from '@/components/auth/OtpInput'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import {
  getOtpCooldownRemaining,
  markOtpSent,
  OTP_COOLDOWN_SECONDS,
} from '@/lib/otpCooldown'

const OTP_MINUTES = 10

function VerifyInner() {
  const { t, locale } = useI18n()
  const { refresh } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  const email = params.get('email') ?? ''
  const purpose = params.get('purpose') ?? 'register'

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [resending, setResending] = useState(false)

  // Countdown resend cooldown
  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  // Khi vào page lần đầu: đọc cooldown còn lại từ localStorage (sống qua F5).
  // Lần gửi OTP đầu tiên được mark trong /auth/register sau khi đăng ký thành công.
  // Nếu localStorage trống (vd user vào trực tiếp /auth/verify) → remaining = 0 →
  // button Resend hiện ngay; BE vẫn có cooldown server-side bảo vệ.
  useEffect(() => {
    if (!email) return
    setResendIn(getOtpCooldownRemaining(email, purpose))
  }, [email, purpose])

  async function submitCode(value: string) {
    if (!/^\d{6}$/.test(value)) return
    setLoading(true)
    setError(null)
    try {
      await api('/otp/verify', {
        method: 'POST',
        body: { email, purpose, code: value },
        locale,
      })
      // Register flow: BE đã set `emailVerifiedAt` → refresh để Header thấy user
      if (purpose === 'register') await refresh()
      router.push(`/auth/success?email=${encodeURIComponent(email)}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t('auth.error.otp_invalid'))
        // Mã đã chết (lock vì sai quá nhiều / expire) → cho phép resend ngay,
        // không bắt user đợi cooldown vô nghĩa.
        if (err.code === 'OTP_LOCKED' || err.code === 'OTP_EXPIRED') {
          setResendIn(0)
        }
      } else {
        setError(t('auth.error.network'))
      }
      // KHÔNG setCode('') ở đây — giữ lại các số user vừa gõ để họ thấy state cũ,
      // error/red border sẽ tự clear khi họ bắt đầu chỉnh sửa (handleCodeChange).
    } finally {
      setLoading(false)
    }
  }

  function handleCodeChange(next: string) {
    setCode(next)
    if (error) setError(null)
  }

  async function handleResend() {
    if (resendIn > 0) return
    setResending(true)
    setError(null)
    try {
      await api('/otp/send', { method: 'POST', body: { email, purpose }, locale })
      markOtpSent(email, purpose)
      setResendIn(OTP_COOLDOWN_SECONDS)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError(t('auth.error.network'))
    } finally {
      setResending(false)
    }
  }

  // Nếu không có email trong URL → quay về register
  if (!email) {
    return (
      <AuthCard
        eyebrow={t('auth.otp.eyebrow')}
        title={t('auth.otp.title')}
        subtitle=""
      >
        <Link href="/auth/register" className="block">
          <AuthButton type="button" variant="ghost">
            {t('auth.otp.change_email')}
          </AuthButton>
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow={t('auth.otp.eyebrow')}
      title={t('auth.otp.title')}
      subtitle={t('auth.otp.subtitle')
        .replace('{{email}}', email)
        .replace('{{minutes}}', String(OTP_MINUTES))}
      footer={
        <Link
          href={`/auth/change-email?email=${encodeURIComponent(email)}`}
          className="text-wood-dark/65 hover:text-wood-dark transition"
        >
          {t('auth.otp.change_email')}
        </Link>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-wood-dark/85">
              {t('auth.otp.label')}
            </label>
          </div>
          <OtpInput
            value={code}
            onChange={handleCodeChange}
            disabled={loading}
            error={Boolean(error)}
          />
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2.5 bg-[#b53333]/10 text-[13px] text-[#7a2222] shadow-[inset_0_0_0_1px_rgba(181,51,51,0.22)]">
            {error}
          </div>
        )}

        <AuthButton
          type="button"
          loading={loading}
          disabled={!/^\d{6}$/.test(code)}
          onClick={() => submitCode(code)}
        >
          {loading ? t('auth.otp.submitting') : t('auth.otp.cta')}
        </AuthButton>

        <div className="text-center text-[13px] text-wood-dark/65 pt-1">
          {t('auth.otp.no_code')}{' '}
          {resendIn > 0 ? (
            <span className="text-wood-dark/45">
              {t('auth.otp.resend_cooldown').replace('{{seconds}}', String(resendIn))}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 font-semibold text-amber hover:text-[#d65a08] underline-offset-2 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resending && (
                <span
                  aria-hidden
                  className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
                />
              )}
              {t('auth.otp.resend')}
            </button>
          )}
        </div>
      </div>
    </AuthCard>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  )
}
