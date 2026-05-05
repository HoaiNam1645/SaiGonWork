'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { ShoppingBagIcon, MenuIcon, XIcon } from './Icons'

export default function Header() {
  const { itemCount, toggleCart } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastScrolled = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const next = window.scrollY > 40
        if (next !== lastScrolled) {
          lastScrolled = next
          setScrolled(next)
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const subtitleClass = scrolled ? 'text-parchment/50' : 'text-wood-dark/65'
  const navLinkClass = scrolled
    ? 'text-parchment/80 hover:text-gold'
    : 'text-wood-dark/80 hover:text-wood-dark'
  const mobileIconClass = scrolled ? 'text-parchment' : 'text-wood-dark'

  return (
    <header
      className={`fixed left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'top-0 bg-wood-dark/95 backdrop-blur-md shadow-xl py-2'
          : 'top-[42px] bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="group">
          <div className="leading-none">
            <div className="font-display text-gold text-2xl font-bold tracking-wider group-hover:text-gold-light transition-colors">
              Sai Gon Wok
            </div>
            <div className={`${subtitleClass} text-[10px] tracking-[0.3em] uppercase mt-0.5`}>
              Vietnamese · Stuttgart
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {[
            { href: '#menu', label: 'Speisekarte' },
            { href: '#popular', label: 'Spezialitäten' },
            { href: '#about', label: 'Über Uns' },
            { href: '#contact', label: 'Kontakt' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={`${navLinkClass} transition-colors text-sm font-medium tracking-wide relative group`}
            >
              {label}
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gold scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleCart}
            aria-label="Warenkorb öffnen"
            className="relative flex items-center gap-2 bg-gold hover:bg-gold-light text-wood-dark font-semibold text-sm px-4 sm:px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ShoppingBagIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Warenkorb</span>
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber text-white text-[11px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold ring-2 ring-wood-dark">
                {itemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={`md:hidden p-1 ${mobileIconClass}`}
            aria-label="Menü öffnen"
          >
            {mobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-wood-dark/95 backdrop-blur-md border-t border-gold/20 px-4 py-4">
          {[
            { href: '#menu', label: 'Speisekarte' },
            { href: '#popular', label: 'Spezialitäten' },
            { href: '#about', label: 'Über Uns' },
            { href: '#contact', label: 'Kontakt' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block text-parchment/80 hover:text-gold py-3 border-b border-gold/10 last:border-0 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
