'use client'

import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nContext'
import { TruckIcon } from './Icons'

// Prefix các route không phải bán hàng — promo banner sẽ ẩn ở đây.
const HIDDEN_PREFIXES = ['/auth', '/admin', '/staff', '/legal']

export default function PromoBanner() {
  const { t } = useI18n()
  const pathname = usePathname()

  if (pathname && HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) {
    return null
  }

  return (
    <div className="bg-amber text-white text-center py-2.5 text-xs sm:text-sm font-medium relative z-30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
        <TruckIcon className="w-4 h-4" />
        <span>{t('promo.banner')}</span>
      </div>
    </div>
  )
}
