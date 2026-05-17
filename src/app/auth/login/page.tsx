'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import AuthInput from '@/components/auth/AuthInput'
import AuthButton from '@/components/auth/AuthButton'
import { useI18n } from '@/i18n/I18nContext'
import { useAuth, type AuthUser } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'

/** Chỉ chấp nhận internal path. External URL bị reject để chống open redirect. */
function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//')) return '/'           // chặn protocol-relative
  return raw
}

/** Sau khi login: admin/staff → /admin (trừ khi `next` đã được set rõ ràng tới path khác). */
function landingForRole(role: AuthUser['role'], next: string): string {
  if (next !== '/') return next  // user đã có ý định cụ thể → tôn trọng
  return role === 'admin' || role === 'staff' ? '/admin' : '/'
}

function LoginInner() {
  const { t, locale } = useI18n()
  const { refresh } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError(t('auth.error.required'))
      return
    }
    setLoading(true)
    try {
      const res = await api<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body:   { email, password },
        locale,
      })
      await refresh()
      router.push(landingForRole(res.user.role, next))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t('auth.error.invalid_credentials'))
      } else {
        setError(t('auth.error.network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      eyebrow={t('auth.login.eyebrow')}
      footer={
        <>
          {t('auth.login.no_account')}{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-amber hover:text-[#d65a08] underline-offset-2 hover:underline"
          >
            {t('auth.login.create_account')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label={t('auth.login.email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <AuthInput
          label={t('auth.login.password')}
          type={showPwd ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              className="text-[12px] font-medium uppercase tracking-wide text-wood-dark/60 hover:text-wood-dark transition"
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? 'HIDE' : 'SHOW'}
            </button>
          }
        />

        <div className="flex justify-end pt-1">
          <Link
            href="/auth/forgot"
            className="text-[13px] text-wood-dark/65 hover:text-wood-dark transition"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2.5 bg-[#b53333]/10 text-[13px] text-[#7a2222] shadow-[inset_0_0_0_1px_rgba(181,51,51,0.22)]">
            {error}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>
          {loading ? t('auth.login.submitting') : t('auth.login.cta')}
        </AuthButton>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-wood-dark/15" />
          <span className="text-[12px] uppercase tracking-[0.16em] text-wood-dark/45">
            {t('auth.login.or')}
          </span>
          <div className="flex-1 h-px bg-wood-dark/15" />
        </div>

        <Link href="/" className="block">
          <AuthButton type="button" variant="ghost">
            {t('auth.login.continue_guest')}
          </AuthButton>
        </Link>
      </form>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
