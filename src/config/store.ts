/**
 * Store identity constants — fallback duy nhất khi `useStoreSettings()` chưa load
 * xong, hoặc cho server components / metadata không thể dùng hook.
 *
 * Single source of truth — đừng hardcode lại địa chỉ / SĐT / tên ở chỗ khác.
 * Client components nên ưu tiên data từ `useStoreSettings()` và chỉ rơi về đây
 * khi `store == null` (loading/error).
 */

export const STORE_FALLBACK = {
  name:    'Sai Gon Wok',
  city:    'Stuttgart',
  country: 'Germany',
  url:     'https://saigonwok-stuttgart.de',

  // Địa chỉ — chia thành phần riêng để dùng cho JSON-LD; render thì join lại.
  address: {
    street:     'Kanalstraße 10',
    postalCode: '70182',
    locality:   'Stuttgart',
    country:    'DE',
    /** Single-line dùng cho map URL / footer 1-dòng. */
    fullLine:   'Kanalstraße 10, 70182 Stuttgart',
  },

  /** JSON-LD opening hours (Mon–Sat 11:00–21:30, Sun closed). */
  openingHours: {
    days:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '11:00',
    close: '21:30',
  },

  cuisines:   ['Vietnamese', 'Asian'] as const,
  priceRange: '€€',
} as const

/** Helper: tạo Google Maps link cho địa chỉ shop hiện tại (hoặc fallback). */
export function mapsUrl(addressLine: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(addressLine)}`
}
