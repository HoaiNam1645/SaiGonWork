'use client'

import { useEffect, useState } from 'react'

interface Props {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        'text' | 'tel' | 'email'
  /** Debounce delay (ms). 0 = immediate. */
  debounceMs?:  number
}

/**
 * Filter input — label phía trên + ô input có debounce + nút clear.
 * Dùng làm 1 ô trong filter grid của admin table.
 */
export default function FilterInput({
  label, value, onChange, placeholder, type = 'text', debounceMs = 350,
}: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    if (local === value) return
    if (debounceMs <= 0) { onChange(local); return }
    const h = window.setTimeout(() => onChange(local), debounceMs)
    return () => window.clearTimeout(h)
  }, [local, value, onChange, debounceMs])

  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={local}
          onChange={e => setLocal(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition"
        />
        {local && (
          <button
            type="button"
            onClick={() => { setLocal(''); onChange('') }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors w-5 h-5 flex items-center justify-center rounded"
            aria-label="Clear"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </label>
  )
}
