'use client'

import { usePathname } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'

/**
 * Bảo vệ /orders/* — bắt buộc user đã đăng nhập.
 * Bất kỳ role nào (customer/staff/admin) cũng được — staff/admin xem đơn của họ.
 * Anonymous → 401 page với CTA Sign in (redirect back qua ?next=).
 *
 * Ngoại lệ public (guest cũng vào được):
 *  - /orders/lookup — tra cứu đơn bằng email + OTP
 *  - /orders/[code] — chi tiết đơn, access check ở BE bằng guest/lookup token
 */
const PUBLIC_PREFIXES = ['/orders/lookup']

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false
  // /orders/lookup hoặc bất kỳ /orders/<code> đều public — handler BE tự check token
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return true
  // /orders/<something> (code) — public; chỉ /orders/ và /orders (list) là cần auth
  const m = pathname.match(/^\/orders\/([^/]+)\/?$/)
  if (m && m[1] !== '') return true
  return false
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isPublicPath(pathname)) return <>{children}</>
  return <AuthGuard>{children}</AuthGuard>
}
