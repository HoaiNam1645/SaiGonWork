'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useI18n } from '@/i18n/I18nContext'
import { useStoreSettings } from '@/lib/storeApi'
import { computeStoreStatus } from '@/lib/storeStatus'
import type { CartItem } from '@/types'
import { XIcon, PlusIcon, MinusIcon, TrashIcon, ShoppingBagIcon, ArrowRightIcon } from './Icons'

const NOTE_DEBOUNCE_MS = 600

function NoteInput({
  cartId,
  initialNote,
  onSave,
}: {
  cartId: string
  initialNote: string
  onSave: (cartId: string, note: string) => Promise<void> | void
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(initialNote)
  // Sync khi item bị thay đổi từ ngoài (vd login → server cart trả note khác)
  const lastExternalRef = useRef(initialNote)
  useEffect(() => {
    if (lastExternalRef.current !== initialNote) {
      lastExternalRef.current = initialNote
      setValue(initialNote)
    }
  }, [initialNote])

  // Debounced save — không spam API mỗi ký tự
  useEffect(() => {
    if (value === initialNote) return
    const handle = window.setTimeout(() => {
      void onSave(cartId, value)
    }, NOTE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [value, initialNote, cartId, onSave])

  return (
    <input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialNote) void onSave(cartId, value)
      }}
      maxLength={255}
      placeholder={t('cart.note_placeholder')}
      aria-label={t('cart.note_aria')}
      className="mt-2 w-full bg-white border border-gold/20 focus:border-gold/60 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-wood-dark placeholder:text-wood/35 transition-colors"
    />
  )
}

export default function CartDrawer() {
  const { items, isOpen, total, closeCart, removeItem, updateQuantity, updateNote, clearCart } = useCart()
  const { t } = useI18n()
  const { store } = useStoreSettings()
  const status = store
    ? computeStoreStatus(store.isOpen, store.openHours)
    : { acceptingOrders: true, closedReason: null }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={closeCart}
          aria-hidden
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-parchment z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label={t('cart.aria_label')}
      >
        <div className="bg-wood-dark px-6 py-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-gold text-xl font-bold leading-tight">{t('cart.title')}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-parchment/60">{items.length} {t('cart.items_count')}</span>
              {items.length > 0 && (
                <>
                  <span className="text-parchment/25">·</span>
                  <button
                    onClick={clearCart}
                    className="inline-flex items-center gap-1 text-parchment/55 hover:text-amber transition-colors"
                  >
                    <TrashIcon className="w-3 h-3" />
                    <span>{t('cart.clear')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <button
            onClick={closeCart}
            className="text-parchment/70 hover:text-gold transition-colors p-1.5 rounded-full hover:bg-white/5 flex-shrink-0"
            aria-label={t('cart.close_aria')}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-wood/50">
              <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                <ShoppingBagIcon className="w-10 h-10" />
              </div>
              <p className="font-display text-xl text-wood-dark">{t('cart.empty.title')}</p>
              <p className="text-sm max-w-xs">{t('cart.empty.body')}</p>
              <button
                onClick={closeCart}
                className="mt-2 text-gold hover:text-gold-light text-sm font-semibold flex items-center gap-1"
              >
                <span>{t('cart.empty.cta')}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gold/15">
              {items.map((item: CartItem) => (
                <li key={item.cartId} className="py-4">
                  <div className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-parchment-dark flex-shrink-0 border border-gold/15">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gold/40">
                          <ShoppingBagIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-wood-dark text-sm leading-snug line-clamp-2">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="text-wood/55 text-xs mt-0.5">{item.variantLabel}</p>
                      )}
                      <p className="text-gold font-bold text-base mt-1.5">
                        {(item.price * item.quantity).toFixed(2).replace('.', ',')} €
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                      <button
                        onClick={() => removeItem(item.cartId)}
                        className="text-wood/40 hover:text-red-500 transition-colors"
                        aria-label={t('cart.remove_aria')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 bg-white border border-gold/20 rounded-full px-1 py-1">
                        <button
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          className="w-6 h-6 rounded-full hover:bg-gold/10 text-wood-dark flex items-center justify-center transition-colors"
                          aria-label={t('cart.qty_minus_aria')}
                        >
                          <MinusIcon className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-wood-dark">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                          className="w-6 h-6 rounded-full hover:bg-gold/10 text-wood-dark flex items-center justify-center transition-colors"
                          aria-label={t('cart.qty_plus_aria')}
                        >
                          <PlusIcon className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <NoteInput
                    cartId={item.cartId}
                    initialNote={item.note ?? ''}
                    onSave={updateNote}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gold/20 bg-white">
            <div className="flex items-center justify-between mb-1 text-wood/60 text-sm">
              <span>{t('cart.subtotal')}</span>
              <span>{total.toFixed(2).replace('.', ',')} €</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-bold text-wood-dark text-lg">{t('cart.total')}</span>
              <span className="font-display font-bold text-gold text-2xl">
                {total.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            {status.acceptingOrders ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full bg-wood-dark hover:bg-wood text-gold font-bold py-4 rounded-xl text-base transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <span>{t('cart.checkout')}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <div className="mb-3 rounded-xl bg-amber/10 border border-amber/30 px-3.5 py-3 text-[13px] text-wood-dark/80">
                  <div className="font-semibold text-amber mb-0.5">{t('store.closed.title')}</div>
                  <div className="text-[12px] leading-relaxed">
                    {store?.closedMessage?.trim()
                      ? store.closedMessage
                      : t(status.closedReason === 'off_hours' ? 'store.closed.off_hours' : 'store.closed.manual')}
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full bg-wood-dark/40 text-parchment/70 font-bold py-4 rounded-xl text-base cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>{t('cart.checkout')}</span>
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
