// Thin fetch wrapper cho backend Express ở localhost:4000 (hoặc env)
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
    public vars?: Record<string, string | number>,
  ) {
    super(message)
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  locale?: string
  /** Guest token (cấp sau khi verify OTP). Sẽ gắn vào header X-Guest-Token. */
  guestToken?: string
  /** Lookup token (cấp sau khi verify OTP purpose=order_lookup). X-Lookup-Token. */
  lookupToken?: string
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, locale, headers, guestToken, lookupToken, ...rest } = opts

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(locale       ? { 'X-Locale':       locale       } : {}),
      ...(guestToken   ? { 'X-Guest-Token':  guestToken   } : {}),
      ...(lookupToken  ? { 'X-Lookup-Token': lookupToken  } : {}),
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? safeJsonParse(text) : null

  if (!res.ok) {
    const errObj = (data ?? {}) as {
      error?: string
      message?: string
      fieldErrors?: Record<string, string>
      vars?: Record<string, string | number>
    }
    throw new ApiError(
      res.status,
      errObj.error ?? 'Error',
      errObj.message ?? `HTTP ${res.status}`,
      errObj.fieldErrors,
      errObj.vars,
    )
  }
  return data as T
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}
