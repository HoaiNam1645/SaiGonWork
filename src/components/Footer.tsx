'use client'

import { menuCategories } from '@/data/menu'
import { useI18n } from '@/i18n/I18nContext'
import { InstagramIcon, FacebookIcon, MapPinIcon, ClockIcon } from './Icons'

export default function Footer() {
  const { t, tCategory } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-wood-dark border-t border-gold/20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="font-display text-gold text-3xl font-bold tracking-wide mb-2">
              Sai Gon Wok
            </div>
            <div className="text-parchment/40 text-[10px] tracking-[0.3em] uppercase mb-5">
              Vietnamese · Stuttgart
            </div>
            <p className="text-parchment/60 text-sm leading-relaxed max-w-md mb-6">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full border border-gold/25 hover:border-gold hover:bg-gold/10 text-parchment/70 hover:text-gold flex items-center justify-center transition-colors"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full border border-gold/25 hover:border-gold hover:bg-gold/10 text-parchment/70 hover:text-gold flex items-center justify-center transition-colors"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-gold mb-5 text-sm tracking-widest uppercase">
              {t('footer.menu')}
            </h4>
            <ul className="space-y-2.5">
              {menuCategories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <a
                    href="#menu"
                    className="text-parchment/60 hover:text-gold text-sm transition-colors"
                  >
                    {tCategory(cat.id)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-gold mb-5 text-sm tracking-widest uppercase">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3 text-parchment/60 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                <span>
                  Kanalstraße 10<br />
                  70182 Stuttgart
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ClockIcon className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                <span>
                  {t('footer.hours')}<br />
                  {t('footer.closed')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gold/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-parchment/35 text-xs">
          <p>© {year} Sai Gon Wok Stuttgart · {t('footer.rights')}</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gold transition-colors">{t('footer.imprint')}</a>
            <a href="#" className="hover:text-gold transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-gold transition-colors">{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
