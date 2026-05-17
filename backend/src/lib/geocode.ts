export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

/**
 * Forward geocode 1 dòng địa chỉ qua Nominatim public.
 * Public Nominatim có rate limit + yêu cầu User-Agent nhận diện app.
 * Production có thể tự host hoặc dùng Mapbox/Google.
 */
export async function geocodeAddress(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    format:           'json',
    addressdetails:   '0',
    limit:            '1',
    countrycodes:     'de',
    'accept-language': 'de',
    q:                query,
  })
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        signal,
        headers: {
          'Accept':     'application/json',
          'User-Agent': 'SaiGonWok/1.0 (contact@saigonwok.de)',
        },
      },
    )
    if (!res.ok) return null
    const arr = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    const hit = arr[0]
    if (!hit) return null
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng, displayName: hit.display_name }
  } catch {
    return null
  }
}
