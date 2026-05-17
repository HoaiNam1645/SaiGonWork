'use client'

import { useEffect, useState } from 'react'

interface Props {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  /** Debounce delay (ms). Set 0 để fire immediate. */
  debounceMs?:  number
  className?:   string
}

/**
 * Search input cho admin tables với debounce mặc định 300ms.
 * Hiển thị icon search trái + nút clear "×" khi có text.
 */
export default function SearchInput({
  value, onChange, placeholder, debounceMs = 300, className = '',
}: Props) {
  const [local, setLocal] = useState(value)

  // Sync khi parent đổi value (vd reset filter)
  useEffect(() => { setLocal(value) }, [value])

  // Debounced flush ra parent
  useEffect(() => {
    if (local === value) return
    if (debounceMs <= 0) {
      onChange(local)
      return
    }
    const h = window.setTimeout(() => onChange(local), debounceMs)
    return () => window.clearTimeout(h)
  }, [local, value, onChange, debounceMs])

  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
      />
      {local && (
        <button
          type="button"
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors w-5 h-5 flex items-center justify-center rounded"
          aria-label="Clear"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
