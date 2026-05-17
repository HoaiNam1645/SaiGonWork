'use client'

import { useEffect, useState } from 'react'
import { api } from './api'
import type { MenuCategory, MenuItem } from '@/types'
import { menuCategories as fallbackMenu } from '@/data/menu'

/** Shape của response từ backend GET /api/menu */
interface ApiVariant {
  valueId: string
  label: string
  labelEn: string | null
  price: number   // full price (base + delta)
}

interface ApiDish {
  id: string
  slug: string
  nameVi: string
  nameEn: string | null
  descriptionVi: string | null
  descriptionEn: string | null
  price: number
  currency: string
  imageUrl: string | null
  isFeatured: boolean
  spicyLevel: number
  prepTimeMin: number | null
  optionId: string | null
  variants: ApiVariant[] | null
}

interface ApiCategory {
  id: string
  slug: string
  nameVi: string
  nameEn: string | null
  description: string | null
  imageUrl: string | null
  displayOrder: number
  dishes: ApiDish[]
}

interface ApiMenuResponse {
  categories: ApiCategory[]
}

/** Đổi 1 ApiCategory thành MenuCategory (legacy shape mà components hiện đang dùng) */
function toMenuCategory(c: ApiCategory, _index: number): MenuCategory {
  return {
    id:   c.slug,     // legacy: id = slug
    name: c.nameVi,
    icon: c.slug,     // icon string — frontend không dùng nhiều, để slug
    items: c.dishes.map((d, i) => toMenuItem(d, i + 1)),
  }
}

function toMenuItem(d: ApiDish, index: number): MenuItem {
  const hasVariants = !!(d.variants && d.variants.length > 0)
  return {
    id:          d.slug,
    number:      String(index),     // DB không có "number" — dùng display order
    name:        d.nameVi,
    description: d.descriptionVi ?? undefined,
    price:       hasVariants ? undefined : d.price,
    variants:    hasVariants
      ? d.variants!.map(v => ({ label: v.label, price: v.price, valueId: v.valueId }))
      : undefined,
    image:       d.imageUrl ?? undefined,
    isPopular:   d.isFeatured,
    dishId:      d.id,
    optionId:    d.optionId ?? undefined,
    // isVegan / isVegetarian chưa có trong DB schema → admin thêm sau qua tag/option
  }
}

/** Fetch + adapt menu từ backend API */
export async function fetchMenu(locale?: string): Promise<MenuCategory[]> {
  const res = await api<ApiMenuResponse>('/menu', { locale })
  return res.categories.map(toMenuCategory)
}

// Module-level cache — fetch 1 lần per session, share across components
let cache: MenuCategory[] | null = null
let inflight: Promise<MenuCategory[]> | null = null

/**
 * Hook trả MenuCategory[] — dùng fallback từ data/menu.ts trong khi fetch lần đầu,
 * sau đó tự cập nhật khi API trả về. Lần mount sau đọc thẳng từ cache.
 *
 * Tradeoff: components không cần thêm loading state — chỉ thấy data thay đổi 1 lần.
 */
export function useMenuCategories(): MenuCategory[] {
  const [data, setData] = useState<MenuCategory[]>(() => cache ?? fallbackMenu)

  useEffect(() => {
    if (cache) return
    if (!inflight) {
      inflight = fetchMenu()
        .then(menu => {
          cache = menu
          return menu
        })
        .catch(err => {
          console.warn('[menu] API fetch failed, keep fallback:', err)
          return fallbackMenu
        })
        .finally(() => {
          // inflight cleared after resolve/reject — next mount uses cache
        })
    }
    inflight.then(menu => setData(menu))
  }, [])

  return data
}

/** Helper để clear cache (vd sau khi admin sửa menu — gọi từ admin UI sau) */
export function invalidateMenuCache(): void {
  cache = null
  inflight = null
}
