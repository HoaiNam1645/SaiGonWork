import { MapPinIcon, ClockIcon, TruckIcon, ArrowRightIcon } from './Icons'

export default function ContactSection() {
  return (
    <section id="contact" className="bg-parchment py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              Besuchen Sie Uns
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-wood-dark">
            Kontakt & Öffnungszeiten
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-gold/15 rounded-3xl p-8 hover:border-gold/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-5">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-wood-dark text-xl mb-3">Adresse</h3>
            <p className="text-wood/75 leading-relaxed mb-4">
              Kanalstraße 10<br />
              70182 Stuttgart<br />
              Deutschland
            </p>
            <a
              href="https://maps.google.com/?q=Kanalstraße+10,+70182+Stuttgart"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:text-gold-light text-sm font-semibold group"
            >
              <span>Auf der Karte öffnen</span>
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="bg-white border border-gold/15 rounded-3xl p-8 hover:border-gold/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mb-5">
              <ClockIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-wood-dark text-xl mb-3">Öffnungszeiten</h3>
            <div className="space-y-2.5 text-wood/75">
              <div className="flex justify-between gap-4">
                <span className="font-medium">Mo – Sa</span>
                <span>11:00 – 21:30</span>
              </div>
              <div className="border-t border-gold/15 pt-2.5 flex justify-between gap-4">
                <span className="font-medium">Sonntag</span>
                <span className="text-amber font-medium">Geschlossen</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-wood/45">Küche schließt 30 Min. vor Feierabend</p>
          </div>

          <div className="bg-wood-dark border border-gold/30 rounded-3xl p-8 hover:shadow-2xl hover:shadow-gold/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mb-5">
              <TruckIcon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-gold text-xl mb-3">Jetzt Bestellen</h3>
            <p className="text-parchment/70 text-sm mb-6 leading-relaxed">
              Genießen Sie unsere authentischen Gerichte bequem zu Hause oder im Büro — frisch zubereitet und schnell geliefert.
            </p>
            <a
              href="#menu"
              className="inline-flex w-full items-center justify-center gap-2 bg-gold hover:bg-gold-light text-wood-dark font-bold px-6 py-3.5 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 text-sm"
            >
              <span>Zur Speisekarte</span>
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
