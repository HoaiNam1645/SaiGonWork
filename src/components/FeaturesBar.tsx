'use client'

import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { LeafIcon, ChefHatIcon, SparklesIcon, TruckIcon } from './Icons'

const features: { Icon: React.ComponentType<{ className?: string }>; titleKey: TKey; descKey: TKey }[] = [
  { Icon: LeafIcon,     titleKey: 'features.fresh.title',     descKey: 'features.fresh.desc' },
  { Icon: SparklesIcon, titleKey: 'features.vegan.title',     descKey: 'features.vegan.desc' },
  { Icon: ChefHatIcon,  titleKey: 'features.authentic.title', descKey: 'features.authentic.desc' },
  { Icon: TruckIcon,    titleKey: 'features.fast.title',      descKey: 'features.fast.desc' },
]

export default function FeaturesBar() {
  const { t } = useI18n()
  return (
    <section className="bg-parchment border-b border-gold/15 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-wood-dark text-base mb-1">{t(titleKey)}</h3>
              <p className="text-wood/60 text-sm leading-snug">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
