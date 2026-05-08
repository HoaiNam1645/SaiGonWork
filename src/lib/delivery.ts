export const RESTAURANT = {
  name: 'Sai Gon Wok',
  address: 'Kanalstraße 10, 70182 Stuttgart',
  // Approximate coordinates for Kanalstraße 10, 70182 Stuttgart
  lat: 48.7843,
  lng: 9.1928,
}

export const DELIVERY = {
  pricePerKm: 2,
  freeShippingThreshold: 25,
  maxRadiusKm: 15,
  kitchenPrepMinutes: 25,
}

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  distanceKm: number
  durationMinutes: number
  geometry: [number, number][] // [lat, lng] pairs
}

/** Compute shipping cost from km and subtotal. Free if subtotal hits the threshold. */
export function computeShipping(km: number | null, subtotal: number): number | null {
  if (km == null) return null
  if (subtotal >= DELIVERY.freeShippingThreshold) return 0
  return Math.ceil(km) * DELIVERY.pricePerKm
}

/** Format euro amount in DE/EN style with comma. */
export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`
}

/** Fetch a route from the public OSRM demo server. Returns null on failure. */
export async function fetchRoute(
  origin: LatLng,
  dest: LatLng,
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) return null
    const coords = route.geometry?.coordinates as [number, number][] | undefined
    if (!coords) return null
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: coords.map(([lng, lat]) => [lat, lng] as [number, number]),
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
