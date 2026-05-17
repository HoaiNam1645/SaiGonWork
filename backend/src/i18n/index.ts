import type { NextFunction, Request, Response } from 'express'
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from './locales'
import { dictionary, type TKey } from './dictionary'

export { DEFAULT_LOCALE, LOCALES, type Locale, type TKey }

/** Interpolate `{{var}}` placeholders */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

/** Look up a key in the dictionary. Fallback to default locale, then key itself. */
export function translate(
  locale: Locale,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  const tpl =
    dictionary[locale]?.[key] ??
    dictionary[DEFAULT_LOCALE]?.[key] ??
    key
  return interpolate(tpl, vars)
}

/**
 * Detect locale ưu tiên theo thứ tự:
 * 1. `?lang=de` query
 * 2. `X-Locale` header
 * 3. Cookie `locale`
 * 4. `Accept-Language` header (chỉ tag chính, vd "de-DE" → "de")
 * 5. DEFAULT_LOCALE
 */
export function detectLocale(req: Request): Locale {
  const q = req.query?.lang
  if (isLocale(q)) return q

  const h = req.headers['x-locale']
  if (typeof h === 'string' && isLocale(h)) return h

  const c = req.cookies?.locale
  if (isLocale(c)) return c

  const accept = req.headers['accept-language']
  if (typeof accept === 'string') {
    // "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7" → ["de-DE", "de", ...]
    const tags = accept.split(',').map(s => s.trim().split(';')[0].split('-')[0])
    for (const tag of tags) {
      if (isLocale(tag)) return tag
    }
  }

  return DEFAULT_LOCALE
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      locale: Locale
      t: (key: TKey, vars?: Record<string, string | number>) => string
    }
  }
}

/** Express middleware — attach `req.locale` và `req.t()` */
export function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  const locale = detectLocale(req)
  req.locale = locale
  req.t = (key, vars) => translate(locale, key, vars)
  res.setHeader('Content-Language', locale)
  next()
}

/** Helper cho code không có req (vd cron job, socket handler) */
export function t(locale: Locale, key: TKey, vars?: Record<string, string | number>): string {
  return translate(locale, key, vars)
}

/** Tự đoán locale từ address country (giao DE → de, ngược lại → en) */
export function localeFromCountry(country?: string | null): Locale {
  if (country === 'DE' || country === 'AT' || country === 'CH') return 'de'
  return 'en'
}
