'use client'

import { useI18n } from '@/i18n/I18nContext'
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/dictionary'

interface AuthCardProps {
  eyebrow: string
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function AuthCard({ eyebrow, title, subtitle, children, footer }: AuthCardProps) {
  const { t, locale, setLocale } = useI18n()

  const cycleLocale = () => {
    const idx = LOCALES.indexOf(locale)
    const next: Locale = LOCALES[(idx + 1) % LOCALES.length]
    setLocale(next)
  }

  const hasTitle = Boolean(title)

  return (
    <div className="w-full max-w-md relative">
      {/* Card */}
      <div
        className="
          relative bg-[#FBF6E9] rounded-3xl px-7 sm:px-10 py-9
          shadow-[0_0_0_1px_rgba(60,35,10,0.08),0_28px_60px_-30px_rgba(60,35,10,0.45),0_8px_24px_-12px_rgba(60,35,10,0.18)]
        "
      >
        {/* Language toggle — góc trên phải card */}
        <button
          type="button"
          onClick={cycleLocale}
          aria-label={t('lang.label')}
          className="
            absolute top-5 right-5 z-10
            text-xs font-semibold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full
            text-wood-dark/70 bg-parchment/70 hover:bg-parchment
            shadow-[0_0_0_1px_rgba(60,35,10,0.08)]
            transition
          "
        >
          {LOCALE_LABEL[locale]}
        </button>

        {/* Editorial header */}
        <div className={`mb-7 ${hasTitle ? '' : 'text-center mt-1'}`}>
          <span
            className={`
              inline-block text-[11px] uppercase tracking-[0.18em] text-amber font-semibold
              ${hasTitle ? 'mb-3' : ''}
            `}
          >
            {eyebrow}
          </span>
          {hasTitle && (
            <h1 className="font-display text-[28px] sm:text-[32px] leading-[1.15] text-wood-dark font-medium">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-3 text-[15px] leading-[1.6] text-wood-dark/65">
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>

      {footer && <div className="mt-6 text-center text-sm text-wood-dark/70">{footer}</div>}
    </div>
  )
}
