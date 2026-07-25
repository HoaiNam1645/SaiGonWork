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

  /** JSON-LD opening hours (Mo–So 11:00–22:00 — theo note nhà hàng 07/2026). */
  openingHours: {
    days:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '11:00',
    close: '22:00',
  },

  cuisines:   ['Vietnamese', 'Asian'] as const,
  priceRange: '€€',

  /** SĐT hiển thị — fallback khi store.hotline chưa load (nguồn động: DB). */
  phone: '+49 711 241567',
} as const

/** Mạng xã hội chính thức — brand constants (không có trong DB). */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/sai.gon.wok',
  facebook:  'https://www.facebook.com/profile.php?id=61589391457999',
} as const

/** tel: link từ số hiển thị (bỏ khoảng trắng/ký tự thừa, giữ +). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

/** Helper: tạo Google Maps link cho địa chỉ shop hiện tại (hoặc fallback). */
export function mapsUrl(addressLine: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(addressLine)}`
}
