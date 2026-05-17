'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import AuthButton from '@/components/auth/AuthButton'
import { useI18n } from '@/i18n/I18nContext'

function SuccessInner() {
  const { t } = useI18n()
  const params = useSearchParams()
  const email = params.get('email')

  return (
    <AuthCard
      eyebrow={t('auth.otp.eyebrow')}
      title={t('auth.success.title')}
      subtitle={t('auth.success.body')}
    >
      {/* Big circular checkmark — terracotta-warm tones, matches DESIGN ring shadow */}
      <div className="flex justify-center py-4">
        <div
          className="
            relative w-24 h-24 rounded-full flex items-center justify-center
            bg-amber/15
            shadow-[0_0_0_8px_rgba(232,101,10,0.07),0_0_0_1px_rgba(232,101,10,0.25)]
          "
        >
          <svg
            viewBox="0 0 48 48"
            className="w-12 h-12 text-amber"
            aria-hidden
          >
            <path
              d="M12 24l8 8 16-18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {email && (
        <p className="text-center text-[13px] text-wood-dark/55 mb-6">
          {email}
        </p>
      )}

      <div className="space-y-3">
        <Link href="/#menu" className="block">
          <AuthButton type="button">
            {t('auth.success.cta_orders')}
          </AuthButton>
        </Link>
        <Link href="/" className="block">
          <AuthButton type="button" variant="ghost">
            {t('auth.success.cta_home')}
          </AuthButton>
        </Link>
      </div>
    </AuthCard>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  )
}
