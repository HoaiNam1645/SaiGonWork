import type { MetadataRoute } from 'next'
import { STORE_FALLBACK } from '@/config/store'

// /sitemap.xml — site 1 trang chính (menu/về/liên hệ đều là anchor trên homepage).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             STORE_FALLBACK.url,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        1,
    },
  ]
}
