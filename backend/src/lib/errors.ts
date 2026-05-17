export type ErrorVars = Record<string, string | number>

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public vars?: ErrorVars,
  ) {
    super(message)
  }
}

export const BadRequest   = (msg = 'common.unknown_error', code?: string, vars?: ErrorVars) => new HttpError(400, msg, code, vars)
export const Unauthorized = (msg = 'common.unauthorized',  code?: string, vars?: ErrorVars) => new HttpError(401, msg, code, vars)
export const Forbidden    = (msg = 'common.forbidden',     code?: string, vars?: ErrorVars) => new HttpError(403, msg, code, vars)
export const NotFound     = (msg = 'common.not_found',     code?: string, vars?: ErrorVars) => new HttpError(404, msg, code, vars)
export const Conflict     = (msg = 'common.unknown_error', code?: string, vars?: ErrorVars) => new HttpError(409, msg, code, vars)
export const TooManyReq   = (msg = 'common.too_many_requests', code?: string, vars?: ErrorVars) => new HttpError(429, msg, code, vars)
