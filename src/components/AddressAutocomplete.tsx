'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import {
  searchAddress,
  formatNominatim,
  type NominatimResult,
} from '@/lib/delivery'

interface Props {
  value: string
  onChangeText: (v: string) => void
  onSelect: (result: NominatimResult) => void
  placeholder?: string
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder,
}: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
    if (value.trim().length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const r = await searchAddress(value.trim(), ctrl.signal)
      if (!ctrl.signal.aborted) {
        setResults(r)
        setHighlight(0)
        setLoading(false)
        setOpen(true)
      }
    }, 450)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  function pick(r: NominatimResult) {
    onChangeText(formatNominatim(r))
    onSelect(r)
    setOpen(false)
    setResults([])
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87867f] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t('checkout.field.address_search')}
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white text-[#141413] text-[15px] placeholder:text-[#87867f] outline-none transition"
          style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
          onFocusCapture={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px #c96442'
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 1px #e8e6dc'
          }}
          autoComplete="off"
        />
      </div>

      {open && (loading || results.length > 0) && (
        <div
          className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl bg-[#faf9f5] overflow-hidden"
          style={{
            boxShadow: '0 0 0 1px #e8e6dc, 0 4px 24px rgba(0,0,0,0.05)',
          }}
        >
          {loading && (
            <div className="px-4 py-3 text-[13px] text-[#87867f]">
              {t('checkout.address_searching')}
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-[#87867f]">
              {t('checkout.address_no_results')}
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-72 overflow-auto">
              {results.map((r, idx) => {
                const isOn = idx === highlight
                const main = formatNominatim(r)
                return (
                  <li key={`${r.lat}-${r.lon}-${idx}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        pick(r)
                      }}
                      onMouseEnter={() => setHighlight(idx)}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        isOn ? 'bg-[#e8e6dc]' : 'bg-transparent'
                      }`}
                    >
                      <div className="text-[14px] text-[#141413] leading-snug">
                        {main}
                      </div>
                      {r.display_name && r.display_name !== main && (
                        <div className="text-[12px] text-[#87867f] mt-0.5 line-clamp-1">
                          {r.display_name}
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
