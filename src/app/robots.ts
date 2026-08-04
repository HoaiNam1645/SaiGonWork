import type { MetadataRoute } from 'next'
import { STORE_FALLBACK } from '@/config/store'

// /robots.txt — cho phép index trang public, chặn khu vực riêng tư/giao dịch.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/account',
        '/auth',
        '/checkout',
        '/orders',
        '/api/',
        '/banking/',
        '/upload/',
      ],
    },
    sitemap: `${STORE_FALLBACK.url}/sitemap.xml`,
  }
}
