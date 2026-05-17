'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import AuthInput from '@/components/auth/AuthInput'
import AuthButton from '@/components/auth/AuthButton'
import LoadingOverlay from '@/components/auth/LoadingOverlay'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import { markOtpSent } from '@/lib/otpCooldown'

export default function RegisterPage() {
  const { t, locale } = useI18n()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [website, setWebsite] = useState('') // honeypot — user thật không thấy field này
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!fullName || !email || !phone || !password || !acceptTerms) {
      setError(t('auth.error.required'))
      return
    }
    setLoading(true)
    try {
      const data = await api<{ otpSent: boolean; resumed?: boolean }>('/auth/register', {
        method: 'POST',
        body: { fullName, email, phone, password, website },
        locale,
      })
      // Chỉ start cooldown nếu BE thực sự gửi OTP. Nếu fail (vd hit rate limit),
      // không mark → /auth/verify mở ra với cooldown 0 → user bấm Resend được ngay.
      if (data.otpSent) markOtpSent(email, 'register')
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&purpose=register`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors(err.fieldErrors)
          setError(null)
        } else {
          setError(err.message || t('auth.error.email_taken'))
        }
      } else {
        setError(t('auth.error.network'))
      }
    } finally {
      setLoading(false)
    }
  }

  const termsTpl = t('auth.register.terms')
  const termsLink = t('auth.register.terms_link')
  const privacyLink = t('auth.register.privacy_link')

  return (
    <>
      <LoadingOverlay
        visible={loading}
        title={t('auth.register.loading.title')}
        description={t('auth.register.loading.body')}
      />
      <AuthCard
      eyebrow={t('auth.register.eyebrow')}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.have_account')}{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-amber hover:text-[#d65a08] underline-offset-2 hover:underline"
          >
            {t('auth.register.sign_in')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {/* Honeypot — ẩn khỏi user thật, bot fill mọi field sẽ tự lộ */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        >
          <label htmlFor="website">Website (do not fill)</label>
          <input
            id="website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={e => setWebsite(e.target.value)}
          />
        </div>

        <AuthInput
          label={t('auth.register.full_name')}
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          error={fieldErrors.fullName}
        />

        <AuthInput
          label={t('auth.register.email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <AuthInput
          label={t('auth.register.phone')}
          type="tel"
          autoComplete="tel"
          required
          placeholder="+49 …"
          hint={t('auth.register.phone_hint')}
          value={phone}
          onChange={e => setPhone(e.target.value)}
          error={fieldErrors.phone}
        />

        <AuthInput
          label={t('auth.register.password')}
          type={showPwd ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          hint={t('auth.register.password_hint')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={fieldErrors.password}
          trailing={
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              className="text-[12px] font-medium uppercase tracking-wide text-wood-dark/60 hover:text-wood-dark transition"
              aria-label={showPwd ? 'Hide' : 'Show'}
            >
              {showPwd ? 'HIDE' : 'SHOW'}
            </button>
          }
        />

        <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
          <span className="relative inline-flex items-center justify-center w-[18px] h-[18px] mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="peer absolute opacity-0 w-full h-full cursor-pointer"
            />
            <span
              className={`
                w-full h-full rounded-[5px] transition
                shadow-[inset_0_0_0_1px_rgba(60,35,10,0.3)]
                peer-checked:bg-amber peer-checked:shadow-[inset_0_0_0_1px_rgba(232,101,10,0.65)]
                peer-focus-visible:shadow-[inset_0_0_0_1px_rgba(232,101,10,0.65),0_0_0_3px_rgba(232,101,10,0.18)]
              `}
            />
            {acceptTerms && (
              <svg
                viewBox="0 0 16 16"
                className="absolute w-3 h-3 text-parchment pointer-events-none"
                aria-hidden
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="text-[13px] leading-[1.55] text-wood-dark/75">
            {termsTpl
              .split(/(\{\{terms\}\}|\{\{privacy\}\})/)
              .map((part, i) => {
                if (part === '{{terms}}') {
                  return (
                    <Link key={i} href="/legal/terms" className="underline text-wood-dark hover:text-amber">
                      {termsLink}
                    </Link>
                  )
                }
                if (part === '{{privacy}}') {
                  return (
                    <Link key={i} href="/legal/privacy" className="underline text-wood-dark hover:text-amber">
                      {privacyLink}
                    </Link>
                  )
                }
                return <span key={i}>{part}</span>
              })}
          </span>
        </label>

        {error && (
          <div className="rounded-lg px-3 py-2.5 bg-[#b53333]/10 text-[13px] text-[#7a2222] shadow-[inset_0_0_0_1px_rgba(181,51,51,0.22)]">
            {error}
          </div>
        )}

        <AuthButton type="submit" loading={loading} disabled={!acceptTerms}>
          {loading ? t('auth.register.submitting') : t('auth.register.cta')}
        </AuthButton>
      </form>
    </AuthCard>
    </>
  )
}
