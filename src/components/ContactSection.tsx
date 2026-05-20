'use client'

import { useI18n } from '@/i18n/I18nContext'
import { useStoreSettings } from '@/lib/storeApi'
import { STORE_FALLBACK, mapsUrl } from '@/config/store'
import { MapPinIcon, ClockIcon, TruckIcon, ArrowRightIcon } from './Icons'

export default function ContactSection() {
  const { t } = useI18n()
  const { store } = useStoreSettings()
  const addressLine = store?.address ?? STORE_FALLBACK.address.fullLine
  return (
    <section id="contact" className="bg-parchment py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              {t('contact.eyebrow')}
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-wood-dark">
            {t('contact.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-gold/15 rounded-3xl p-8 hover:border-gold/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-5">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-wood-dark text-xl mb-3">{t('contact.address')}</h3>
            <p className="text-wood/75 leading-relaxed mb-4 whitespace-pre-line">
              {addressLine}
              {'\n'}
              {t('contact.address.country')}
            </p>
            <a
              href={mapsUrl(addressLine)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:text-gold-light text-sm font-semibold group"
            >
              <span>{t('contact.openMap')}</span>
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="bg-white border border-gold/15 rounded-3xl p-8 hover:border-gold/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-5">
              <ClockIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-wood-dark text-xl mb-3">{t('contact.hours.title')}</h3>
            <div className="space-y-2.5 text-wood/75">
              <div className="flex justify-between gap-4">
                <span className="font-medium">{t('contact.hours.weekdays')}</span>
                <span>11:00 – 21:30</span>
              </div>
              <div className="border-t border-gold/15 pt-2.5 flex justify-between gap-4">
                <span className="font-medium">{t('contact.hours.sunday')}</span>
                <span className="text-amber font-medium">{t('contact.hours.closed')}</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-wood/45">{t('contact.hours.note')}</p>
          </div>

          <div className="bg-wood-dark border border-gold/30 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mb-5">
              <TruckIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-gold text-xl mb-3">{t('contact.order.title')}</h3>
            <p className="text-parchment/70 text-sm mb-6 leading-relaxed">
              {t('contact.order.desc')}
            </p>
            <a
              href="#menu"
              className="inline-flex w-full items-center justify-center gap-2 bg-gold hover:bg-gold-light text-wood-dark font-bold px-6 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 text-sm"
            >
              <span>{t('contact.order.cta')}</span>
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
