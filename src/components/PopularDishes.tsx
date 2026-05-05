import Image from 'next/image'
import { menuCategories } from '@/data/menu'
import { ArrowRightIcon, FlameIcon } from './Icons'

export default function PopularDishes() {
  const popularItems = menuCategories
    .flatMap((c) => c.items)
    .filter((i) => i.isPopular)
    .slice(0, 6)

  return (
    <section id="popular" className="bg-parchment-dark py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-gold" />
              <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
                Empfehlung des Hauses
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-wood-dark leading-tight">
              Unsere
              <span className="text-gold italic"> Spezialitäten</span>
            </h2>
          </div>
          <p className="text-wood/65 max-w-md text-base">
            Die Lieblingsgerichte unserer Gäste — sorgfältig ausgewählt, mit Liebe zubereitet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularItems.map((item, idx) => {
            const isLarge = idx === 0
            const minPrice = item.price ?? Math.min(...(item.variants?.map((v) => v.price) ?? [0]))

            return (
              <a
                key={item.id}
                href="#menu"
                className={`group relative overflow-hidden rounded-3xl shadow-xl ${
                  isLarge ? 'md:col-span-2 md:row-span-2 aspect-square md:aspect-auto md:min-h-[500px]' : 'aspect-[4/5]'
                }`}
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes={isLarge ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-wood-dark via-wood-dark/50 to-transparent" />

                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 bg-amber text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <FlameIcon className="w-3 h-3" />
                    Beliebt
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="text-gold text-xs font-mono mb-2">#{item.number}</div>
                  <h3 className={`font-display font-bold text-parchment leading-tight mb-2 ${isLarge ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className={`text-parchment/70 mb-4 line-clamp-2 ${isLarge ? 'text-base' : 'text-sm'}`}>
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gold font-display font-bold text-xl">
                      ab {minPrice.toFixed(2).replace('.', ',')} €
                    </span>
                    <span className="inline-flex items-center gap-1 text-parchment/80 text-xs group-hover:text-gold group-hover:gap-2 transition-all">
                      <span>Bestellen</span>
                      <ArrowRightIcon className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
