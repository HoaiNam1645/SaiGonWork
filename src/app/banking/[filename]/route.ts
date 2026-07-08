import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Serve ảnh chứng từ CK từ public/banking/ qua route handler (đọc disk lúc request).
// Lý do: `next start` (production) KHÔNG serve file thêm vào public/ lúc runtime —
// chỉ file có sẵn lúc build. Route handler chạy động nên phục vụ được file upload mới.
// URL công khai vẫn là /banking/<file> (khớp giá trị đã lưu ở Order.paymentProofUrl).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPE_BY_EXT: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params

  // Chống path traversal — chỉ cho tên file an toàn (khớp tên do upload handler sinh).
  if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const ext  = filename.split('.').pop()?.toLowerCase() ?? ''
  const type = TYPE_BY_EXT[ext]
  if (!type) return new NextResponse('Not found', { status: 404 })

  const file = path.join(process.cwd(), 'public', 'banking', filename)
  try {
    const buf = await readFile(file)
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type':  type,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
