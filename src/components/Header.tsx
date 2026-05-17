'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nContext'
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/dictionary'
import { ShoppingBagIcon, MenuIcon, XIcon } from './Icons'
import ProfileMenu from './ProfileMenu'

export default function Header() {
  const { itemCount, toggleCart } = useCart()
  const { user } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Auth-dependent UI chỉ render sau hydration để match SSR. Tránh hydration mismatch
  // khi AuthContext lazy init đọc snapshot trên client (khác SSR null).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const showUser = mounted ? user : null

  useEffect(() => {
    let ticking = false
    let lastScrolled = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const next = window.scrollY > 40
        if (next !== lastScrolled) {
          lastScrolled = next
          setScrolled(next)
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const subtitleClass = scrolled ? 'text-parchment/50' : 'text-wood-dark/65'
  const navLinkClass = scrolled
    ? 'text-parchment/80 hover:text-gold'
    : 'text-wood-dark/80 hover:text-wood-dark'
  const mobileIconClass = scrolled ? 'text-parchment' : 'text-wood-dark'

  const navItems = [
    { href: '#menu', label: t('header.menu') },
    { href: '#popular', label: t('header.specialties') },
    { href: '#about', label: t('header.about') },
    { href: '#contact', label: t('header.contact') },
  ]

  const cycleLocale = () => {
    const idx = LOCALES.indexOf(locale)
    const next: Locale = LOCALES[(idx + 1) % LOCALES.length]
    setLocale(next)
  }

  return (
    <header
      style={{ willChange: 'background-color, padding' }}
      className={`fixed left-0 right-0 z-40 [transition:background-color_300ms,box-shadow_300ms,padding_300ms,top_300ms] ${
        scrolled
          ? 'top-0 bg-wood-dark shadow-xl py-2'
          : 'top-[42px] bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="group">
          <div className="leading-none">
            <div className="font-display text-gold text-2xl font-bold tracking-wider group-hover:text-gold-light transition-colors">
              Sai Gon Wok
            </div>
            <div className={`${subtitleClass} text-[10px] tracking-[0.3em] uppercase mt-0.5`}>
              Vietnamese · Stuttgart
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {navItems.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`${navLinkClass} transition-colors text-sm font-medium tracking-wide relative group`}
            >
              {label}
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={cycleLocale}
            aria-label={`${t('lang.label')} — ${LOCALE_LABEL[locale]}`}
            title={`${t('lang.label')}: ${LOCALE_LABEL[locale]}`}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors ${
              scrolled
                ? 'border-gold/30 text-parchment/80 hover:text-gold hover:border-gold/60'
                : 'border-wood-dark/20 text-wood-dark/80 hover:text-wood-dark hover:border-wood-dark/40'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15 15 0 0 1 0 20" />
              <path d="M12 2a15 15 0 0 0 0 20" />
            </svg>
            <span className="text-[11px] font-bold tracking-wider">
              {LOCALE_LABEL[locale]}
            </span>
          </button>

          {showUser ? (
            /* Logged in → profile menu (Orders + Cart đã gom vào dropdown, ẩn khỏi nav) */
            <ProfileMenu variant={scrolled ? 'dark' : 'light'} />
          ) : (
            <>
              {/* Anonymous — giữ Cart ở nav như cũ */}
              <button
                onClick={toggleCart}
                aria-label={t('header.cart_aria')}
                className="relative flex items-center gap-2 bg-gold hover:bg-gold-light text-wood-dark font-semibold text-sm px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('header.cart')}</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber text-white text-[11px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold ring-2 ring-wood-dark">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Login icon */}
              <Link
                href="/auth/login"
                aria-label={t('header.signin_aria')}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors ${
                  scrolled
                    ? 'text-parchment/85 hover:text-gold hover:bg-gold/10'
                    : 'text-wood-dark/85 hover:text-wood-dark hover:bg-wood-dark/[0.06]'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span className="text-sm font-medium tracking-wide">{t('header.signin')}</span>
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={`md:hidden p-1 ${mobileIconClass}`}
            aria-label={t('header.menu_aria')}
          >
            {mobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-wood-dark border-t border-gold/20 px-4 py-4">
          {navItems.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block text-parchment/80 hover:text-gold py-3 border-b border-gold/10 transition-colors"
            >
              {label}
            </a>
          ))}

          {/* Mobile — giữ Orders + signin/profile tuỳ state */}
          {showUser ? (
            <>
              <Link
                href="/orders"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-parchment/80 hover:text-gold py-3 border-b border-gold/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11V6a3 3 0 0 1 6 0v5" />
                  <path d="M5 9h14l-1 11H6L5 9z" />
                </svg>
                {t('header.orders')}
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-parchment/80 hover:text-gold py-3 border-b border-gold/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {t('header.profile.account')}
              </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-parchment/80 hover:text-gold py-3 border-b border-gold/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {t('header.signin')}
            </Link>
          )}

          {/* Language toggle (mobile) */}
          <button
            onClick={cycleLocale}
            aria-label={`${t('lang.label')} — ${LOCALE_LABEL[locale]}`}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/30 text-parchment/80 hover:text-gold hover:border-gold/60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15 15 0 0 1 0 20" />
              <path d="M12 2a15 15 0 0 0 0 20" />
            </svg>
            <span className="text-[11px] font-bold tracking-wider">
              {LOCALE_LABEL[locale]}
            </span>
          </button>
        </div>
      )}
    </header>
  )
}
