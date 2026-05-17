'use client'

import AuthGuard from '@/components/auth/AuthGuard'

/**
 * Bảo vệ /orders/* — bắt buộc user đã đăng nhập.
 * Bất kỳ role nào (customer/staff/admin) cũng được — staff/admin xem đơn của họ.
 * Anonymous → 401 page với CTA Sign in (redirect back qua ?next=).
 */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
