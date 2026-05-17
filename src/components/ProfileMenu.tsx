'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useI18n } from '@/i18n/I18nContext'
import { ShoppingBagIcon } from './Icons'

interface ProfileMenuProps {
  /** Style tuỳ context — light (parchment nav) hay dark (scrolled nav) */
  variant?: 'light' | 'dark'
}

export default function ProfileMenu({ variant = 'light' }: ProfileMenuProps) {
  const { user, logout } = useAuth()
  const { itemCount, toggleCart } = useCart()
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on click outside / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const initial = (user.fullName?.trim()?.[0] ?? user.email[0] ?? '?').toUpperCase()
  const isDark  = variant === 'dark'

  const handleSignOut = async () => {
    setOpen(false)
    await logout()
    router.push('/')
  }

  const handleCart = () => {
    setOpen(false)
    toggleCart()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('header.profile_aria')}
        aria-expanded={open}
        className={`
          relative w-8 h-8 rounded-full flex items-center justify-center font-display text-[13px] font-medium
          transition-all duration-200 hover:scale-105 active:scale-95
          ${
            isDark
              ? 'bg-gold/15 text-gold hover:bg-gold/25 ring-1 ring-gold/30'
              : 'bg-wood-dark text-parchment hover:bg-wood ring-1 ring-wood-dark/20'
          }
        `}
      >
        {initial}
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber text-white text-[9px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center font-bold ring-2 ring-parchment">
            {itemCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="
            absolute right-0 mt-2 w-56 rounded-xl bg-[#FBF6E9] z-50
            shadow-[0_0_0_1px_rgba(60,35,10,0.08),0_16px_32px_-16px_rgba(60,35,10,0.4)]
            origin-top-right
          "
        >
          {/* Header info */}
          <div className="px-3.5 py-2.5 border-b border-wood-dark/10">
            <div className="text-[10px] uppercase tracking-[0.14em] text-wood-dark/55 font-semibold">
              {t('header.profile.signed_in_as')}
            </div>
            <div className="mt-0.5 font-display text-[15px] leading-tight text-wood-dark truncate">
              {user.fullName}
            </div>
            <div className="text-[11.5px] text-wood-dark/60 truncate">{user.email}</div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleCart}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] text-wood-dark hover:bg-wood-dark/[0.05] transition"
            >
              <span className="flex items-center gap-2">
                <ShoppingBagIcon className="w-3.5 h-3.5 text-amber" />
                {t('header.cart')}
              </span>
              {itemCount > 0 && (
                <span className="text-[10px] font-bold text-amber bg-amber/15 px-1.5 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </button>

            <Link
              href="/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-wood-dark hover:bg-wood-dark/[0.05] transition"
            >
              <svg className="w-3.5 h-3.5 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11V6a3 3 0 0 1 6 0v5" />
                <path d="M5 9h14l-1 11H6L5 9z" />
              </svg>
              {t('header.orders')}
            </Link>

            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-wood-dark hover:bg-wood-dark/[0.05] transition"
            >
              <svg className="w-3.5 h-3.5 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t('header.profile.account')}
            </Link>

            {user.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-wood-dark hover:bg-wood-dark/[0.05] transition"
              >
                <svg className="w-3.5 h-3.5 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Admin Panel
              </Link>
            )}
          </div>

          <div className="border-t border-wood-dark/10 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-[#7a2222] hover:bg-[#b53333]/8 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('header.profile.signout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
