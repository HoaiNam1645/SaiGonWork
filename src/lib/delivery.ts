export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  distanceKm: number
  durationMinutes: number
  geometry: [number, number][] // [lat, lng] pairs
}

/** Cấu hình tính phí — đẩy từ store_settings xuống qua useStoreSettings(). */
export interface ShippingConfig {
  /** € / km */
  perKm:             number
  /** Subtotal threshold để miễn phí ship (null = không bao giờ free) */
  freeShipThreshold: number | null
  /** Phí ship base (cộng vào trước perKm) */
  baseFee:           number
}

/**
 * Tính phí ship preview (BE sẽ recompute lúc submit để chốt chính xác).
 * Trả null nếu chưa có km. Trùng công thức với backend pricing.ts:
 *   subtotal ≥ threshold → 0
 *   else                  → baseFee + km * perKm  (round 2)
 */
export function computeShipping(
  km:       number | null,
  subtotal: number,
  cfg:      ShippingConfig | null,
): number | null {
  if (km == null || !cfg) return null
  if (cfg.freeShipThreshold !== null && subtotal >= cfg.freeShipThreshold) return 0
  const raw = cfg.baseFee + km * cfg.perKm
  return Math.round(raw * 100) / 100
}

/** Format euro amount in DE/EN style with comma. */
export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`
}

interface OsrmRouteRaw {
  distance: number
  duration: number
  geometry?: { coordinates?: [number, number][] }
}

/**
 * Fetch route từ OSRM với chiến lược chống "ăn gian":
 * - Request `alternatives=true` → OSRM trả tối đa 3 tuyến
 * - Pick tuyến có DISTANCE ngắn nhất (cùng thuật toán với backend)
 * - Polyline + km + duration đều của tuyến rẻ nhất → FE preview khớp với BE recompute
 */
export async function fetchRoute(
  origin: LatLng,
  dest: LatLng,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json() as { routes?: OsrmRouteRaw[] }
    const routes = data.routes ?? []
    if (routes.length === 0) return null
    const best = routes.reduce((a, b) => (a.distance <= b.distance ? a : b))
    const coords = best.geometry?.coordinates
    if (!coords) return null
    return {
      distanceKm:      best.distance / 1000,
      durationMinutes: best.duration / 60,
      geometry:        coords.map(([lng, lat]) => [lat, lng] as [number, number]),
    }
  } catch {
    return null
  }
}

export interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    postcode?: string
    city?: string
    town?: string
    village?: string
    suburb?: string
    country?: string
  }
}

/** Forward geocoding via Nominatim, biased to the Stuttgart region. */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'de',
    'accept-language': 'de',
    q: query,
    // viewbox biases results around Stuttgart — left,top,right,bottom
    viewbox: '8.95,48.90,9.40,48.65',
    bounded: '1',
  })
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { signal, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    return (await res.json()) as NominatimResult[]
  } catch {
    return []
  }
}

/** Reverse geocoding for a given lat/lng. */
export async function reverseGeocode(
  point: LatLng,
  signal?: AbortSignal,
): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    'accept-language': 'de',
    lat: String(point.lat),
    lon: String(point.lng),
  })
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { signal, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    return (await res.json()) as NominatimResult
  } catch {
    return null
  }
}

/** Format a Nominatim result into a clean single-line label. */
export function formatNominatim(r: NominatimResult): string {
  const a = r.address ?? {}
  const street = [a.road, a.house_number].filter(Boolean).join(' ')
  const city = a.city ?? a.town ?? a.village ?? a.suburb ?? ''
  const main = [street, [a.postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return main || r.display_name
}
