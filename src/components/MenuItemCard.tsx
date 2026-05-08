'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useI18n } from '@/i18n/I18nContext'
import type { MenuItem } from '@/types'
import { PlusIcon, FlameIcon, LeafIcon } from './Icons'

export default function MenuItemCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart()
  const { t } = useI18n()
  const [selectedVariant, setSelectedVariant] = useState(0)

  const hasVariants = item.variants && item.variants.length > 0
  const activeVariant = hasVariants ? item.variants![selectedVariant] : null
  const displayPrice = activeVariant?.price ?? item.price

  function handleAdd() {
    addItem({
      menuItemId: item.id,
      name: item.name,
      variantLabel: activeVariant?.label,
      price: displayPrice!,
      image: item.image,
    })
  }

  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-gold/10 hover:border-gold/40 hover:shadow-2xl hover:shadow-wood-dark/10 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-parchment-dark">
        {item.image && (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {item.isPopular && (
            <span className="inline-flex items-center gap-1 bg-amber text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <FlameIcon className="w-3 h-3" />
              {t('tag.popular')}
            </span>
          )}
          {item.isVegan && (
            <span className="inline-flex items-center gap-1 bg-bamboo text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <LeafIcon className="w-3 h-3" />
              {t('tag.vegan')}
            </span>
          )}
          {!item.isVegan && item.isVegetarian && (
            <span className="inline-flex items-center gap-1 bg-bamboo/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <LeafIcon className="w-3 h-3" />
              {t('tag.vegetarian')}
            </span>
          )}
        </div>

        {/* Number badge */}
        <div className="absolute top-3 right-3 bg-wood-dark/90 text-gold text-xs font-mono font-semibold px-2.5 py-1 rounded-full">
          #{item.number}
        </div>

        {/* Add button overlay */}
        <button
          onClick={handleAdd}
          aria-label={`${item.name} — ${t('menu.add_to_cart_aria_suffix')}`}
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-gold hover:bg-gold-light text-wood-dark flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
        >
          <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display font-bold text-wood-dark text-lg leading-tight">
            {item.name}
            {item.tag && (
              <span className="ml-2 text-xs font-normal text-wood/50">· {item.tag}</span>
            )}
          </h3>
          {displayPrice && (
            <span className="font-display text-gold font-bold text-xl whitespace-nowrap">
              {displayPrice.toFixed(2).replace('.', ',')} €
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-wood/65 text-sm leading-relaxed mb-4 flex-1">
            {item.description}
          </p>
        )}

        {hasVariants && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.variants!.map((v, i) => (
              <button
                key={v.label}
                onClick={() => setSelectedVariant(i)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  selectedVariant === i
                    ? 'bg-wood-dark text-gold border-wood-dark font-semibold'
                    : 'border-gold/30 text-wood/80 hover:border-gold/60 bg-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleAdd}
          className="md:hidden w-full bg-wood-dark hover:bg-wood text-gold font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 mt-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t('menu.add_to_cart')}</span>
        </button>
      </div>
    </article>
  )
}
