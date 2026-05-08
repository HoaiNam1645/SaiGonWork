'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  DEFAULT_LOCALE,
  LOCALES,
  dictionary,
  DATE_LOCALE,
  type Locale,
  type TKey,
} from './dictionary'

const STORAGE_KEY = 'sgw-locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TKey) => string
  tCategory: (id: string) => string
  formatDate: (iso: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && (LOCALES as readonly string[]).includes(stored)) {
        setLocaleState(stored as Locale)
        document.documentElement.lang = stored
      }
    } catch {}
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      document.documentElement.lang = next
    } catch {}
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionary[locale]
    return {
      locale,
      setLocale,
      t: (key) => dict[key] ?? key,
      tCategory: (id) => dict[`category.${id}`] ?? id,
      formatDate: (iso) =>
        new Date(iso).toLocaleString(DATE_LOCALE[locale], {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
