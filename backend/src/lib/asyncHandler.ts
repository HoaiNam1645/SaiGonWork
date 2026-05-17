import type { NextFunction, Request, Response, RequestHandler } from 'express'

/**
 * Wrap async handler để lỗi tự forward tới errorHandler (Express 4 không tự
 * bắt promise rejection). Express 5 sẽ không cần.
 */
export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const ah = asyncHandler
