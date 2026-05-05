import { StarIcon, QuoteIcon } from './Icons'

const reviews = [
  {
    name: 'Anna M.',
    rating: 5,
    text: 'Die beste Pho in Stuttgart! Die Brühe schmeckt einfach unglaublich authentisch und das Personal ist super freundlich. Wir kommen immer wieder.',
    source: 'Google Bewertung',
  },
  {
    name: 'Michael K.',
    rating: 5,
    text: 'Top Qualität, faire Preise und große Portionen. Die Sommerrollen sind ein absolutes Muss. Vegane Optionen sind auch hervorragend.',
    source: 'Google Bewertung',
  },
  {
    name: 'Linh T.',
    rating: 5,
    text: 'Endlich vietnamesisches Essen wie zu Hause! Bun Bo Nam Bo schmeckt wie in Saigon. Sehr empfehlenswert für alle Liebhaber asiatischer Küche.',
    source: 'Google Bewertung',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-wood-dark py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              Was unsere Gäste sagen
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-parchment leading-tight">
            Bewertungen unserer
            <span className="block text-gold italic">zufriedenen Gäste</span>
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
                {review.text}
              </p>

              <div className="border-t border-gold/15 pt-4">
                <div className="font-display font-bold text-gold">{review.name}</div>
                <div className="text-parchment/50 text-xs mt-0.5">{review.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
