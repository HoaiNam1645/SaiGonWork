import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '@/lib/errors'
import { translate, DEFAULT_LOCALE, type TKey } from '@/i18n'

/** Detect chuỗi có là i18n key không (vd "auth.invalid_credentials"). */
function isI18nKey(s: string): boolean {
  return /^[a-z]+(\.[a-z_]+)+$/i.test(s)
}

function resolveMessage(req: Request, err: HttpError): string {
  const locale = req.locale ?? DEFAULT_LOCALE
  if (isI18nKey(err.message)) {
    return translate(locale, err.message as TKey, err.vars)
  }
  return err.message
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const locale = req.locale ?? DEFAULT_LOCALE
    // Translate từng issue.message nếu là i18n key
    const issues = err.issues.map(it => ({
      ...it,
      message: isI18nKey(it.message) ? translate(locale, it.message as TKey) : it.message,
    }))
    // Field error map: { phone: "...", password: "..." } — tiện cho frontend bind vào input
    const fieldErrors: Record<string, string> = {}
    for (const it of issues) {
      const key = it.path.join('.')
      if (key && !fieldErrors[key]) fieldErrors[key] = it.message
    }
    return res.status(400).json({
      error: 'ValidationError',
      message: req.t ? req.t('validation.invalid_payload') : 'Invalid request payload',
      issues,
      fieldErrors,
    })
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code ?? 'Error',
      message: resolveMessage(req, err),
    })
  }

  console.error('[unhandled]', err)
  return res.status(500).json({
    error: 'InternalServerError',
    message: req.t ? req.t('common.unknown_error') : 'Something went wrong',
  })
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    error: 'NotFound',
    message: req.t ? req.t('common.not_found') : 'Route not found',
  })
}
