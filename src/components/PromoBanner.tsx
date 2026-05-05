import { TruckIcon } from './Icons'

export default function PromoBanner() {
  return (
    <div className="bg-amber text-white text-center py-2.5 text-xs sm:text-sm font-medium relative z-30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
        <TruckIcon className="w-4 h-4" />
        <span>
          <strong>10% Rabatt</strong> auf Ihre erste Online-Bestellung · Kostenlose Lieferung ab 25€
        </span>
      </div>
    </div>
  )
}
