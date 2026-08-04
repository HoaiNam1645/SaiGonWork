import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Upload ảnh MÓN ĂN từ admin UI → ghi public/dishes/<rand>.<ext>, trả {url:"/dishes/…"}.
// Chạy trên frontend (next start) — không nằm dưới /api (nginx route /api về backend).
// CHỈ ADMIN: route handler không giữ JWT secret nên xác thực bằng cách forward cookie
// sang backend GET /auth/me (localhost:4000) và yêu cầu role=admin.
// Serve lại file: GET /dishes/[filename] (next start không serve file public thêm lúc runtime).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:4000'

async function isAdmin(req: Request): Promise<boolean> {
  const cookie = req.headers.get('cookie')
  if (!cookie) return false
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { cookie },
      cache:   'no-store',
    })
    if (!res.ok) return false
    const data = (await res.json()) as { user?: { role?: string } }
    return data.user?.role === 'admin'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })

  const ext = EXT_BY_TYPE[file.type]
  if (!ext)                    return NextResponse.json({ error: 'UNSUPPORTED_TYPE' }, { status: 415 })
  if (file.size === 0)         return NextResponse.json({ error: 'EMPTY_FILE' }, { status: 400 })
  if (file.size > MAX_BYTES)   return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 })

  const bytes = Buffer.from(await file.arrayBuffer())
  const name  = `${Date.now()}-${randomUUID()}.${ext}`
  const dir   = path.join(process.cwd(), 'public', 'dishes')

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, name), bytes)
  } catch (e) {
    console.error('[dish-image] write failed:', e)
    return NextResponse.json({ error: 'WRITE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ url: `/dishes/${name}` }, { status: 201 })
}
