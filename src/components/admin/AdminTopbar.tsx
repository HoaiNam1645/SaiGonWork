'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nContext'
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/dictionary'
import { useAuth } from '@/context/AuthContext'
import { useAdminShell } from './AdminShellContext'
import { IconSearch, IconMenuOpen, IconChevronDown } from './AdminIcons'
import NotificationDropdown from './NotificationDropdown'

export default function AdminTopbar() {
  const { t, locale, setLocale } = useI18n()
  const { user, logout } = useAuth()
  const { toggleCollapsed, setMobileOpen } = useAdminShell()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const cycleLocale = () => {
    const idx = LOCALES.indexOf(locale)
    const next: Locale = LOCALES[(idx + 1) % LOCALES.length]
    setLocale(next)
  }

  const initial = (user?.fullName?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const firstName = user?.fullName?.split(' ')[0] ?? 'User'

  const onSignOut = async () => {
    setMenuOpen(false)
    await logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 h-[64px] bg-white border-b border-gray-200 flex items-center px-4 sm:px-6">
      {/* LEFT — hamburger + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          aria-label="Open menu"
        >
          <IconMenuOpen className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden lg:inline-flex p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          aria-label={t('admin.nav.collapse')}
          title={t('admin.nav.collapse')}
        >
          <IconMenuOpen className="w-5 h-5" />
        </button>

        <div className="hidden md:block flex-1 max-w-sm">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.topbar.search')}
              className="
                w-full h-10 pl-10 pr-3 rounded-lg text-sm text-gray-900
                bg-gray-50 placeholder:text-gray-400
                border border-gray-200
                focus:outline-none focus:bg-white focus:border-brand-300
                focus:ring-4 focus:ring-brand-500/12
                transition
              "
            />
          </div>
        </div>
      </div>

      {/* RIGHT — language / notifications / profile, gom đều bên phải */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Language toggle — icon-only, đồng bộ size với các nút khác */}
        <button
          type="button"
          onClick={cycleLocale}
          className="
            hidden sm:inline-flex items-center justify-center w-10 h-10 rounded-full
            text-[12px] font-semibold tracking-wider text-gray-600
            hover:bg-gray-100 hover:text-gray-900 transition
          "
          aria-label={t('lang.label')}
          title={`${t('lang.label')}: ${LOCALE_LABEL[locale]}`}
        >
          {LOCALE_LABEL[locale]}
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Divider */}
        <span aria-hidden className="hidden sm:block w-px h-7 bg-gray-200 mx-1" />

        {/* Profile — bigger trigger with name */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={t('admin.topbar.account')}
            aria-expanded={menuOpen}
            className="
              inline-flex items-center gap-2.5 pl-1 pr-2 py-1
              rounded-full hover:bg-gray-100 transition
            "
          >
            <span
              className="
                w-9 h-9 rounded-full flex items-center justify-center
                bg-gradient-to-br from-brand-400 to-brand-600
                text-white font-semibold text-sm
                ring-2 ring-white shadow-[0_1px_2px_rgba(16,24,40,0.1)]
              "
            >
              {initial}
            </span>
            <span className="hidden sm:flex items-center gap-1 pr-1">
              <span className="text-sm font-medium text-gray-700">{firstName}</span>
              <IconChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {menuOpen && (
            <>
              <div
                aria-hidden
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="
                  absolute right-0 mt-2 w-64 rounded-xl bg-white z-50
                  border border-gray-200
                  shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]
                  overflow-hidden
                "
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <span
                    className="
                      w-10 h-10 rounded-full flex items-center justify-center shrink-0
                      bg-gradient-to-br from-brand-400 to-brand-600
                      text-white font-semibold
                    "
                  >
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 font-semibold truncate">
                      {user?.fullName ?? 'User'}
                    </div>
                    <div className="text-[12px] text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="py-1">
                  <DropdownItem
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    label={t('admin.topbar.account')}
                    icon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                  />
                  <DropdownItem
                    href="/admin/settings"
                    onClick={() => setMenuOpen(false)}
                    label={t('admin.nav.settings')}
                    icon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                      </svg>
                    }
                  />
                </div>

                {/* Sign out */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="
                      w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                      text-error-700 hover:bg-error-50 transition
                    "
                  >
                    <span className="inline-flex shrink-0 w-4 h-4 items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                    <span className="flex-1 text-left">{t('admin.topbar.signout')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function DropdownItem({
  href,
  onClick,
  icon,
  label,
}: {
  href: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition group"
    >
      <span className="inline-flex shrink-0 w-4 h-4 items-center justify-center text-gray-500 group-hover:text-gray-700 transition">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </Link>
  )
}
