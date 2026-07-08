import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Route handler chạy trên FRONTEND (next start) — KHÔNG nằm dưới /api nên nginx
// route thẳng về Next.js (port 5175), không đụng backend Express (port 4000).
// Ghi ảnh chứng từ chuyển khoản vào public/banking/ → next start serve tại /banking/<file>.
// Vì frontend build KHÔNG dùng output:'standalone', public/ được serve từ disk lúc
// runtime nên file upload mới xuất hiện được phục vụ ngay.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB (nginx client_max_body_size = 10m)
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })
  }

  const ext = EXT_BY_TYPE[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'UNSUPPORTED_TYPE' }, { status: 415 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'EMPTY_FILE' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 413 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  // Tên file ngẫu nhiên — không tin filename của client (chống path traversal).
  const name    = `${Date.now()}-${randomUUID()}.${ext}`
  const dir     = path.join(process.cwd(), 'public', 'banking')
  const dest    = path.join(dir, name)

  try {
    await mkdir(dir, { recursive: true })   // tự tạo thư mục nếu chưa có
    await writeFile(dest, bytes)
  } catch (e) {
    console.error('[bank-proof] write failed:', e)
    return NextResponse.json({ error: 'WRITE_FAILED' }, { status: 500 })
  }

  // URL công khai — khớp regex BE cho phép: /^\/banking\/[A-Za-z0-9._-]+$/
  return NextResponse.json({ url: `/banking/${name}` }, { status: 201 })
}
