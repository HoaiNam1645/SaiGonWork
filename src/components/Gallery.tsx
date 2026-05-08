'use client'

import Image from 'next/image'
import { galleryImages } from '@/data/menu'
import { useI18n } from '@/i18n/I18nContext'

export default function Gallery() {
  const { t } = useI18n()
  return (
    <section className="bg-parchment py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              {t('gallery.eyebrow')}
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-wood-dark leading-tight">
            {t('gallery.title_pre')}
            <span className="block text-gold italic">{t('gallery.title_accent')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {galleryImages.map((src, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl group ${
                idx === 0 || idx === 5 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'
              }`}
            >
              <Image
                src={src}
                alt={`${t('gallery.alt')} ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-wood-dark/0 group-hover:bg-wood-dark/30 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
