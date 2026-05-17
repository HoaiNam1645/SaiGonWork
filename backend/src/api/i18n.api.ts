import type { Request, Response } from 'express'
import { LOCALES } from '@/i18n'
import { dictionary } from '@/i18n/dictionary'
import { NotFound } from '@/lib/errors'

export function meta(req: Request, res: Response) {
  res.json({
    locale:    req.locale,
    supported: LOCALES,
    sample:    req.t('email.signature'),
  })
}

export function dict(req: Request, res: Response) {
  const loc = req.params.locale
  if (!(loc in dictionary)) throw NotFound('common.not_found')
  res.json({
    locale: loc,
    dict:   dictionary[loc as keyof typeof dictionary],
  })
}
