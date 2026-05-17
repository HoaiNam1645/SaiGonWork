import { env } from '@/config/env'

export interface OsrmRoute {
  distanceKm:        number
  durationMinutes:   number
  /** Số tuyến OSRM trả về (tham khảo cho audit/log) */
  alternativesCount: number
}

/**
 * Gọi OSRM driving routing để lấy quãng đường lái xe thật.
 * Public OSRM demo (`router.project-osrm.org`) miễn phí nhưng có rate-limit;
 * production có thể self-host. Trả null nếu không có route.
 *
 * Chiến lược chống "ăn gian phí ship":
 * - Request `alternatives=true` → OSRM trả tối đa 3 tuyến
 * - Pick tuyến có **distance NGẮN NHẤT** (không phải route đầu tiên / nhanh nhất)
 * - Khách luôn được tính theo tuyến rẻ nhất trong các option OSRM đề xuất
 */
export async function routeDriving(
  origin: { lat: number; lng: number },
  dest:   { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<OsrmRoute | null> {
  const base = env.OSRM_URL.replace(/\/$/, '')
  const url  = `${base}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false&alternatives=true`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json() as {
      code?: string
      routes?: Array<{ distance: number; duration: number }>
    }
    if (data.code !== 'Ok') return null
    const routes = data.routes ?? []
    if (routes.length === 0) return null
    const best = routes.reduce((a, b) => (a.distance <= b.distance ? a : b))
    return {
      distanceKm:        best.distance / 1000,
      durationMinutes:   best.duration / 60,
      alternativesCount: routes.length,
    }
  } catch {
    return null
  }
}
