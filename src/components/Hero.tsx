'use client'

import Image from 'next/image'
import { restaurantInfo } from '@/data/menu'
import { useI18n } from '@/i18n/I18nContext'
import { useStoreSettings } from '@/lib/storeApi'
import { STORE_FALLBACK } from '@/config/store'
import { MapPinIcon, ClockIcon, ArrowRightIcon } from './Icons'

export default function Hero() {
  const { t } = useI18n()
  const { store } = useStoreSettings()
  const addressLine = store?.address ?? STORE_FALLBACK.address.fullLine
  return (
    <section className="relative pt-24 sm:pt-28 pb-16 overflow-hidden">
      {/* Sumi-e mountain landscape — bottom right of hero */}
      <div className="hero-mountain" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Wood-frame container */}
        <div className="menu-frame-shadow relative border-[3px] sm:border-4 border-wood-dark/80 rounded-2xl bg-[#EDE0CC] p-6 sm:p-10">
          {/* Inner gold border */}
          <div className="absolute inset-2 border border-gold/40 rounded-xl pointer-events-none" />

          {/* Corner ornaments */}
          {[
            'top-1 left-1',
            'top-1 right-1 rotate-90',
            'bottom-1 left-1 -rotate-90',
            'bottom-1 right-1 rotate-180',
          ].map((pos) => (
            <svg
              key={pos}
              className={`absolute ${pos} w-8 h-8 text-gold pointer-events-none`}
              viewBox="0 0 32 32"
              fill="currentColor"
              aria-hidden
            >
              <path d="M2 2 h12 v2 h-10 v10 h-2 z M2 6 l4 0 l0 -4" />
            </svg>
          ))}

          <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
            {/* LEFT — Brush text */}
            <div className="text-center lg:text-left">
              {/* MENU label */}
              <div className="inline-flex flex-col items-center mb-4 lg:mb-6">
                <span className="font-marker text-wood-dark text-2xl sm:text-3xl tracking-wider">
                  {t('hero.menu_label')}
                </span>
                <svg viewBox="0 0 60 30" className="w-12 h-6 text-gold mt-1" fill="currentColor" aria-hidden>
                  <path d="M30 5 C25 8 22 12 22 16 C22 22 26 25 30 25 C34 25 38 22 38 16 C38 12 35 8 30 5 Z M28 12 L32 12 M26 17 L34 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </div>

              {/* Brand name in brush font */}
              <h1 className="font-marker text-wood-dark leading-[0.9] mb-3">
                <span className="block text-6xl sm:text-7xl lg:text-8xl">Sai Gon</span>
                <span className="block text-6xl sm:text-7xl lg:text-8xl text-gold ml-8 sm:ml-16">
                  Wok
                </span>
              </h1>

              {/* Ich Bin Da + scooter */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <span className="font-script text-wood-dark text-3xl sm:text-4xl">{t('hero.tagline')}</span>
                <svg className="w-10 h-10 text-wood/70" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <circle cx="16" cy="48" r="6" />
                  <circle cx="48" cy="48" r="6" />
                  <path d="M22 48 L42 48 M48 42 L42 24 L28 24 L24 32 L18 32 L14 44" />
                  <rect x="32" y="14" width="14" height="14" rx="2" />
                  <path d="M36 18 L42 18" />
                </svg>
              </div>

              <p className="font-display text-wood-dark/85 text-xl sm:text-2xl mb-4 italic">
                {t('hero.welcome')}
              </p>

              <p className="font-script text-gold text-4xl sm:text-5xl mb-2 leading-none">
                {t('hero.appetit')}
              </p>
              <p className="text-wood/70 text-sm sm:text-base mb-8">
                {t('hero.thanks')}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <a
                  href="#menu"
                  className="group inline-flex items-center justify-center gap-2 bg-wood-dark hover:bg-wood text-gold font-bold px-7 py-3.5 rounded-full text-sm sm:text-base transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
                >
                  <span>{t('hero.cta_menu')}</span>
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light text-wood-dark font-bold px-7 py-3.5 rounded-full text-sm sm:text-base transition-all"
                >
                  {t('hero.cta_reserve')}
                </a>
              </div>
            </div>

            {/* RIGHT — Cover image */}
            <div className="relative order-first lg:order-last">
              <div className="relative aspect-[3/4] max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl ring-1 ring-wood-dark/20">
                <Image
                  src="/saigon-wok-cover.jpg"
                  alt="Sai Gon Wok Menü — Titelseite"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 500px"
                  className="object-cover"
                />
              </div>
              {/* Stamp/badge */}
              <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-amber text-white rounded-full w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center shadow-2xl rotate-[-12deg] border-4 border-parchment">
                <span className="font-marker text-sm sm:text-base leading-none">{t('hero.since')}</span>
                <span className="font-marker text-xl sm:text-2xl leading-none mt-1">2026</span>
              </div>
            </div>
          </div>

          {/* Address strip at bottom */}
          <div className="relative mt-8 pt-6 border-t border-wood-dark/15 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center lg:justify-end items-center text-wood-dark/80 text-sm">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-gold" />
              <span className="font-medium">{addressLine}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gold" />
              <span className="font-medium">{restaurantInfo.hours.weekdays}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
