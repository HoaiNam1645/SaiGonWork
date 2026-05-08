'use client'

import { useI18n } from '@/i18n/I18nContext'
import { TruckIcon } from './Icons'

export default function PromoBanner() {
  const { t } = useI18n()
  return (
    <div className="bg-amber text-white text-center py-2.5 text-xs sm:text-sm font-medium relative z-30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
        <TruckIcon className="w-4 h-4" />
        <span>{t('promo.banner')}</span>
      </div>
    </div>
  )
}
