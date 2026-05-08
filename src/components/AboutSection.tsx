'use client'

import Image from 'next/image'
import { heroImages } from '@/data/menu'
import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { ChefHatIcon, LeafIcon, StarIcon, ClockIcon } from './Icons'

const stats: { Icon: React.ComponentType<{ className?: string }>; number: string; labelKey: TKey }[] = [
  { Icon: ChefHatIcon, number: '28+',     labelKey: 'about.stat.dishes' },
  { Icon: LeafIcon,    number: '100%',    labelKey: 'about.stat.fresh' },
  { Icon: StarIcon,    number: '4.8',     labelKey: 'about.stat.rating' },
  { Icon: ClockIcon,   number: '11–21:30', labelKey: 'about.stat.hours' },
]

export default function AboutSection() {
  const { t } = useI18n()
  return (
    <section id="about" className="bg-wood-dark py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image collage */}
          <div className="relative h-[480px] lg:h-[600px]">
            <div className="absolute top-0 left-0 w-3/4 h-3/5 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={heroImages.ambience1}
                alt={t('about.image_alt_1')}
                fill
                sizes="(max-width: 1024px) 75vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3/4 h-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-wood-dark">
              <Image
                src={heroImages.ambience2}
                alt={t('about.image_alt_2')}
                fill
                sizes="(max-width: 1024px) 75vw, 40vw"
                className="object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold rounded-full w-32 h-32 flex items-center justify-center text-wood-dark font-display text-center shadow-2xl rotate-[-8deg]">
              <div>
                <div className="text-2xl font-bold leading-none">{t('about.since')}</div>
                <div className="text-3xl font-bold leading-none mt-1">2014</div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-gold" />
              <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
                {t('about.eyebrow')}
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-parchment mb-6 leading-tight">
              {t('about.title_pre')}
              <br />
              <span className="text-gold italic">{t('about.title_accent')}</span>
            </h2>
            <div className="space-y-4 text-parchment/75 leading-relaxed text-base">
              <p>{t('about.p1')}</p>
              <p>{t('about.p2')}</p>
              <p className="font-display italic text-gold text-xl pt-2">{t('about.p3')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              {stats.map(({ Icon, number, labelKey }) => (
                <div
                  key={labelKey}
                  className="bg-parchment/5 border border-gold/15 rounded-2xl p-5 hover:border-gold/40 transition-colors"
                >
                  <Icon className="w-5 h-5 text-gold mb-2" />
                  <div className="font-display text-2xl font-bold text-gold mb-1">{number}</div>
                  <div className="text-parchment/60 text-xs leading-snug">{t(labelKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
