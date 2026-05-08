'use client'

import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { StarIcon, QuoteIcon } from './Icons'

const reviews: { name: string; rating: number; textKey: TKey }[] = [
  { name: 'Anna M.',    rating: 5, textKey: 'testimonials.review1.text' },
  { name: 'Michael K.', rating: 5, textKey: 'testimonials.review2.text' },
  { name: 'Linh T.',    rating: 5, textKey: 'testimonials.review3.text' },
]

export default function Testimonials() {
  const { t } = useI18n()
  return (
    <section className="bg-wood-dark py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              {t('testimonials.eyebrow')}
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-parchment leading-tight">
            {t('testimonials.title_pre')}
            <span className="block text-gold italic">{t('testimonials.title_accent')}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="bg-parchment/5 border border-gold/20 rounded-3xl p-7 backdrop-blur-sm hover:border-gold/40 transition-colors relative"
            >
              <QuoteIcon className="absolute top-6 right-6 w-8 h-8 text-gold/15" />

              <div className="flex gap-0.5 mb-4 text-gold">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4" />
                ))}
              </div>

              <p className="text-parchment/85 leading-relaxed mb-5 text-sm">
                {t(review.textKey)}
              </p>

              <div className="border-t border-gold/15 pt-4">
                <div className="font-display font-bold text-gold">{review.name}</div>
                <div className="text-parchment/50 text-xs mt-0.5">{t('testimonials.source')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
