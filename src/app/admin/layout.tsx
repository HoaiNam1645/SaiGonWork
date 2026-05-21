'use client'

import AuthGuard from '@/components/auth/AuthGuard'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'
import { AdminShellProvider } from '@/components/admin/AdminShellContext'

/**
 * /admin/* — cho role `admin` và `staff` (staff dashboard cũng nằm trong /admin
 * theo FEATURES.md §5.2 — list đơn realtime + xử lý). Page nhạy cảm hơn (menu
 * CRUD, users, audit log…) tự check role bên trong.
 * Sai role → ForbiddenView. Anonymous → UnauthorizedView (CTA login).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={['admin', 'staff']}>
      <AdminShellProvider>
        <div
          data-admin-shell
          className="min-h-screen flex bg-gray-50 font-outfit text-gray-700 antialiased overflow-x-clip"
        >
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-x-clip">
            <AdminTopbar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
          </div>
        </div>
      </AdminShellProvider>
    </AuthGuard>
  )
}
