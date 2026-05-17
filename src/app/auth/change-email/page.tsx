'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import AuthInput from '@/components/auth/AuthInput'
import AuthButton from '@/components/auth/AuthButton'
import LoadingOverlay from '@/components/auth/LoadingOverlay'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'
import { clearOtpSent, markOtpSent } from '@/lib/otpCooldown'

function ChangeEmailInner() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const params = useSearchParams()
  const currentEmail = params.get('email') ?? ''

  const [email, setEmail] = useState(currentEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    if (!email) {
      setError(t('auth.error.required'))
      return
    }
    setLoading(true)
    try {
      const data = await api<{ ok: true; email: string }>('/auth/change-email', {
        method: 'POST',
        body: { email },
        locale,
      })
      // Cooldown của email cũ không còn ý nghĩa — clear, mark email mới
      if (currentEmail && currentEmail !== data.email) {
        clearOtpSent(currentEmail, 'register')
      }
      markOtpSent(data.email, 'register')
      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}&purpose=register`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors?.email) {
          setFieldError(err.fieldErrors.email)
        } else {
          setError(err.message)
        }
      } else {
        setError(t('auth.error.network'))
      }
    } finally {
      setLoading(false)
    }
  }

  const backHref = currentEmail
    ? `/auth/verify?email=${encodeURIComponent(currentEmail)}&purpose=register`
    : '/auth/register'

  return (
    <>
      <LoadingOverlay
        visible={loading}
        title={t('auth.change_email.loading.title')}
        description={t('auth.change_email.loading.body')}
      />
      <AuthCard
        eyebrow={t('auth.change_email.eyebrow')}
        title={t('auth.change_email.title')}
        subtitle={t('auth.change_email.subtitle')}
        footer={
          <Link
            href={backHref}
            className="text-wood-dark/65 hover:text-wood-dark transition"
          >
            {t('auth.change_email.back')}
          </Link>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            label={t('auth.change_email.label')}
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={fieldError}
          />

          {error && (
            <div className="rounded-lg px-3 py-2.5 bg-[#b53333]/10 text-[13px] text-[#7a2222] shadow-[inset_0_0_0_1px_rgba(181,51,51,0.22)]">
              {error}
            </div>
          )}

          <AuthButton type="submit" loading={loading} disabled={!email || email === currentEmail}>
            {loading ? t('auth.change_email.submitting') : t('auth.change_email.cta')}
          </AuthButton>
        </form>
      </AuthCard>
    </>
  )
}

export default function ChangeEmailPage() {
  return (
    <Suspense fallback={null}>
      <ChangeEmailInner />
    </Suspense>
  )
}
