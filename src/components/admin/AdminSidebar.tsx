'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nContext'
import { useAdminShell } from './AdminShellContext'
import { ADMIN_NAV, type AdminNavItem } from './adminNav'
import { IconChevronDown, IconExternal, IconX } from './AdminIcons'
import type { TKey } from '@/i18n/dictionary'

function isActive(pathname: string, href?: string): boolean {
  if (!href) return false
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

function NavItemRow({ item }: { item: AdminNavItem }) {
  const { t } = useI18n()
  const pathname = usePathname() ?? ''
  const { collapsed, setMobileOpen } = useAdminShell()
  const hasChildren = !!item.children?.length
  const groupActive = hasChildren
    ? item.children!.some(c => isActive(pathname, c.href))
    : isActive(pathname, item.href)

  const [open, setOpen] = useState(groupActive)
  useEffect(() => { if (groupActive) setOpen(true) }, [groupActive])

  const Icon = item.icon
  const label = t(item.labelKey as TKey)

  const baseRow =
    'group flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition'

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`
            ${baseRow}
            ${groupActive
              ? 'bg-brand-50 text-brand-500'
              : 'text-gray-700 hover:bg-gray-100'}
            ${collapsed ? 'justify-center' : ''}
          `}
          aria-expanded={open}
          title={collapsed ? label : undefined}
        >
          <Icon className={`w-5 h-5 shrink-0 ${groupActive ? 'text-brand-500' : 'text-gray-500'}`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <IconChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''} ${groupActive ? 'text-brand-500' : 'text-gray-400'}`} />
            </>
          )}
        </button>
        {open && !collapsed && (
          <ul className="mt-1 ml-7 space-y-0.5">
            {item.children!.map(child => {
              const active = isActive(pathname, child.href)
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      block px-3 py-2 rounded-md text-[13px] transition
                      ${active
                        ? 'bg-brand-50 text-brand-500 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    {t(child.labelKey as TKey)}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  const active = isActive(pathname, item.href)
  return (
    <Link
      href={item.href!}
      onClick={() => setMobileOpen(false)}
      className={`
        ${baseRow}
        ${active
          ? 'bg-brand-50 text-brand-500'
          : 'text-gray-700 hover:bg-gray-100'}
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? label : undefined}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-500' : 'text-gray-500'}`} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  )
}

export default function AdminSidebar() {
  const { t } = useI18n()
  const { collapsed, mobileOpen, setMobileOpen } = useAdminShell()

  const width = collapsed ? 'w-[80px]' : 'w-[260px]'

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen
          ${width}
          bg-white border-r border-gray-200
          flex flex-col
          transition-[width,transform] duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className={`px-5 py-5 flex items-center gap-3 ${collapsed ? 'justify-center px-3' : ''}`}>
          <div className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center font-semibold text-lg shrink-0">
            S
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[16px] text-gray-900 font-semibold">
                {t('admin.brand')}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {t('admin.brand.subtitle')}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto text-gray-500 hover:text-gray-900 p-1"
            aria-label="Close menu"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {ADMIN_NAV.map((group, gi) => (
            <div key={gi}>
              {group.labelKey && !collapsed && (
                <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  {t(group.labelKey as TKey)}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavItemRow key={item.labelKey + (item.href ?? '')} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <Link
            href="/"
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
              text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? t('admin.nav.back_to_site') : undefined}
          >
            <IconExternal className="w-4 h-4 shrink-0 text-gray-500" />
            {!collapsed && <span>{t('admin.nav.back_to_site')}</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
