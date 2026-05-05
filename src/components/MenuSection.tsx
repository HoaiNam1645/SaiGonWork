'use client'

import { useState } from 'react'
import { menuCategories } from '@/data/menu'
import MenuItemCard from './MenuItemCard'

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState(menuCategories[0].id)

  const activeItems = menuCategories.find((c) => c.id === activeCategory)?.items ?? []

  return (
    <section id="menu" className="bg-parchment py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-gold/60" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase font-semibold">
              Speisekarte
            </span>
            <div className="h-px w-10 bg-gold/60" />
          </div>
          <h2 className="font-display text-4xl sm:text-6xl font-bold text-wood-dark mb-4 leading-tight">
            Unsere Gerichte
          </h2>
          <p className="text-wood/65 max-w-2xl mx-auto text-base sm:text-lg">
            Von traditioneller Pho-Suppe über knusprige Wok-Kreationen bis zu süßen Desserts —
            entdecken Sie die ganze Vielfalt der vietnamesischen Küche.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center sm:flex-wrap">
          {menuCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-200 flex-shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-wood-dark text-gold shadow-lg shadow-wood-dark/20'
                  : 'bg-white hover:bg-wood-dark/5 text-wood border border-gold/20'
              }`}
            >
              {cat.name}
              <span className={`ml-2 text-xs ${activeCategory === cat.id ? 'text-gold/60' : 'text-wood/40'}`}>
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
