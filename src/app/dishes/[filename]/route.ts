import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Serve ảnh món ăn upload runtime từ public/dishes/ (next start không serve file
// public thêm sau build — cùng pattern với /banking/[filename]).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPE_BY_EXT: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) {
    return new NextResponse('Bad request', { status: 400 })
  }
  const ext  = filename.split('.').pop()?.toLowerCase() ?? ''
  const type = TYPE_BY_EXT[ext]
  if (!type) return new NextResponse('Not found', { status: 404 })

  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'dishes', filename))
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
