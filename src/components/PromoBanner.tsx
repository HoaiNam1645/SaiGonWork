'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nContext'
import { useStoreSettings } from '@/lib/storeApi'
import { computeStoreStatus } from '@/lib/storeStatus'
import { TruckIcon } from './Icons'

// Prefix các route không phải bán hàng — banner sẽ ẩn ở đây.
const HIDDEN_PREFIXES = ['/auth', '/admin', '/staff', '/legal']

export default function PromoBanner() {
  const { t } = useI18n()
  const pathname = usePathname()
  const { store } = useStoreSettings()

  // Tick mỗi 60s để banner tự đổi khi qua giờ mở/đóng.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (pathname && HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) {
    return null
  }

  const status = store
    ? computeStoreStatus(store.isOpen, store.openHours, new Date(nowTick))
    : { acceptingOrders: true, closedReason: null }

  // Đóng cửa → banner cảnh báo (đỏ) thay cho promo, kèm lý do.
  if (!status.acceptingOrders) {
    const reason = store?.closedMessage?.trim()
      ? store.closedMessage
      : t(status.closedReason === 'off_hours'
          ? 'store.closed.reason_off_hours'
          : 'store.closed.reason_manual')
    return (
      <div className="bg-[#b53333] text-white text-center py-2.5 text-xs sm:text-sm font-medium relative z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 min-w-0">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span className="truncate">
            <span className="font-semibold">{t('store.closed.title')}</span>
            <span className="opacity-90"> · {reason}</span>
          </span>
        </div>
      </div>
    )
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
