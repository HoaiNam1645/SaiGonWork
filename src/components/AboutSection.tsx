import Image from 'next/image'
import { heroImages } from '@/data/menu'
import { ChefHatIcon, LeafIcon, StarIcon, ClockIcon } from './Icons'

const stats = [
  { Icon: ChefHatIcon, number: '28+', label: 'Authentische Gerichte' },
  { Icon: LeafIcon, number: '100%', label: 'Frisch täglich' },
  { Icon: StarIcon, number: '4.8', label: 'Google Bewertung' },
  { Icon: ClockIcon, number: '11–21:30', label: 'Mo bis Sa geöffnet' },
]

export default function AboutSection() {
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
                alt="Sai Gon Wok Restaurant Atmosphäre"
                fill
                sizes="(max-width: 1024px) 75vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3/4 h-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-wood-dark">
              <Image
                src={heroImages.ambience2}
                alt="Vietnamesische Spezialitäten"
                fill
                sizes="(max-width: 1024px) 75vw, 40vw"
                className="object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold rounded-full w-32 h-32 flex items-center justify-center text-wood-dark font-display text-center shadow-2xl rotate-[-8deg]">
              <div>
                <div className="text-2xl font-bold leading-none">Seit</div>
                <div className="text-3xl font-bold leading-none mt-1">2014</div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-10 bg-gold" />
              <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
                Unsere Geschichte
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-parchment mb-6 leading-tight">
              Vietnamesische Tradition,
              <br />
              <span className="text-gold italic">aus Liebe zum Geschmack</span>
            </h2>
            <div className="space-y-4 text-parchment/75 leading-relaxed text-base">
              <p>
                Willkommen bei Sai Gon Wok — Ihrem Tor zur authentischen vietnamesischen Küche
                mitten in Stuttgart. Bei uns erleben Sie die Aromen Saigons, zubereitet nach
                traditionellen Familienrezepten.
              </p>
              <p>
                Von der würzigen Pho-Suppe über knusprige Frühlingsrollen bis hin zu
                aromatischen Wok-Gerichten — jede Speise wird täglich frisch mit den besten
                Zutaten zubereitet.
              </p>
              <p className="font-display italic text-gold text-xl pt-2">
                „Guten Appetit — Wir bedanken uns für Ihren Besuch."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              {stats.map(({ Icon, number, label }) => (
                <div
                  key={label}
                  className="bg-parchment/5 border border-gold/15 rounded-2xl p-5 hover:border-gold/40 transition-colors"
                >
                  <Icon className="w-5 h-5 text-gold mb-2" />
                  <div className="font-display text-2xl font-bold text-gold mb-1">{number}</div>
                  <div className="text-parchment/60 text-xs leading-snug">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
