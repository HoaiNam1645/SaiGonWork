import { LeafIcon, ChefHatIcon, SparklesIcon, TruckIcon } from './Icons'

const features = [
  { Icon: LeafIcon, title: 'Frische Zutaten', desc: 'Täglich frisch zubereitet' },
  { Icon: SparklesIcon, title: 'Vegane Optionen', desc: 'Viele pflanzliche Gerichte' },
  { Icon: ChefHatIcon, title: 'Authentisch', desc: 'Traditionelle Rezepte aus Saigon' },
  { Icon: TruckIcon, title: 'Schnelle Lieferung', desc: 'Heiß und frisch geliefert' },
]

export default function FeaturesBar() {
  return (
    <section className="bg-parchment border-b border-gold/15 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-wood-dark text-base mb-1">{title}</h3>
              <p className="text-wood/60 text-sm leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
