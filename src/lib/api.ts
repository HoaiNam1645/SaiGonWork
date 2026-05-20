// Thin fetch wrapper cho backend Express. Cần NEXT_PUBLIC_API_URL set tại build.
// Trong dev, .env.local fallback http://localhost:4000/api. Production build phải
// có env này — nếu thiếu thì module fail loud thay vì im lặng gọi localhost.
const API_BASE = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[api] NEXT_PUBLIC_API_URL is required for production build. ' +
      'Set it in .env or your CI/CD env before `next build`.',
    )
  }
  return 'http://localhost:4000/api'
})()

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
