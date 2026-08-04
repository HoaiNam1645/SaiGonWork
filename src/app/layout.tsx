import type { Metadata } from 'next'
import { Playfair_Display, Nunito, Caveat, Permanent_Marker, Outfit } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'
import { I18nProvider } from '@/i18n/I18nContext'
import { menuCategories, restaurantInfo } from '@/data/menu'
import { STORE_FALLBACK } from '@/config/store'
import PromoBanner from '@/components/PromoBanner'
import CartDrawer from '@/components/CartDrawer'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
})

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  display: 'swap',
})

const permanentMarker = Permanent_Marker({
  variable: '--font-marker',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Sai Gon Wok Stuttgart — Authentische vietnamesische Küche',
    template: '%s | Sai Gon Wok Stuttgart',
  },
  description:
    'Sai Gon Wok in Stuttgart — authentische vietnamesische Küche mit frischen Zutaten. Pho, Wok-Gerichte, Sommerrollen und mehr. Jetzt online bestellen oder besuchen Sie uns in der Kanalstraße 10, 70182 Stuttgart.',
  keywords: [
    'vietnamesisches Restaurant Stuttgart',
    'Sai Gon Wok',
    'Pho Stuttgart',
    'vietnamesisch essen Stuttgart',
    'Wok Gerichte Stuttgart',
    'asiatisches Restaurant Stuttgart',
    'Sommerrollen Stuttgart',
    'Tom Yum Suppe',
    'Bibimbap Stuttgart',
    'vegetarisch vegan asiatisch Stuttgart',
  ],
  authors: [{ name: 'Sai Gon Wok Stuttgart' }],
  creator: 'Sai Gon Wok Stuttgart',
  publisher: 'Sai Gon Wok Stuttgart',
  formatDetection: { telephone: true, email: true, address: true },
  metadataBase: new URL('https://saigonwok-stuttgart.de'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://saigonwok-stuttgart.de',
    siteName: 'Sai Gon Wok Stuttgart',
    title: 'Sai Gon Wok Stuttgart — Authentische vietnamesische Küche',
    description:
      'Erleben Sie die authentischen Aromen Vietnams in Stuttgart. Frische Zutaten, traditionelle Rezepte, herzliche Gastfreundschaft.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sai Gon Wok Stuttgart',
    description: 'Authentische vietnamesische Küche in Stuttgart — Ich Bin Da.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: STORE_FALLBACK.name,
  description: restaurantInfo.description,
  address: {
    '@type': 'PostalAddress',
    streetAddress:    STORE_FALLBACK.address.street,
    addressLocality:  STORE_FALLBACK.address.locality,
    postalCode:       STORE_FALLBACK.address.postalCode,
    addressCountry:   STORE_FALLBACK.address.country,
  },
  openingHoursSpecification: STORE_FALLBACK.openingHours.map(w => ({
    '@type':   'OpeningHoursSpecification',
    dayOfWeek: w.days,
    opens:     w.opens,
    closes:    w.close,
  })),
  servesCuisine: STORE_FALLBACK.cuisines,
  priceRange:    STORE_FALLBACK.priceRange,
  url:           STORE_FALLBACK.url,
  hasMenu: {
    '@type': 'Menu',
    name: 'Sai Gon Wok Speisekarte',
    hasMenuSection: menuCategories.map((cat) => ({
      '@type': 'MenuSection',
      name: cat.name,
      hasMenuItem: cat.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price ?? item.variants?.[0]?.price,
          priceCurrency: 'EUR',
        },
      })),
    })),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${playfair.variable} ${nunito.variable} ${caveat.variable} ${permanentMarker.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <PromoBanner />
              {children}
              <CartDrawer />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
