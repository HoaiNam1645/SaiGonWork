'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import UnauthorizedView from '@/components/error/UnauthorizedView'
import ForbiddenView from '@/components/error/ForbiddenView'

type Role = 'customer' | 'staff' | 'admin'

interface AuthGuardProps {
  /** Role được phép truy cập. Bỏ trống = bất kỳ user đã login. */
  roles?: Role[]
  /**
   * Cách xử lý khi anonymous:
   *  - 'view' (default): render UnauthorizedView (401 page)
   *  - 'redirect': redirect tới /auth/login?next=<pathname>
   */
  whenAnonymous?: 'view' | 'redirect'
  loadingFallback?: React.ReactNode
  children: React.ReactNode
}

export default function AuthGuard({
  roles,
  whenAnonymous = 'view',
  loadingFallback,
  children,
}: AuthGuardProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  // mounted = đã qua hydration. Tránh decision sai (vd 401 view) khi user
  // thực sự đã login nhưng SSR không có localStorage.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!user && whenAnonymous === 'redirect') {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname ?? '/')}`)
    }
  }, [user, mounted, whenAnonymous, pathname, router])

  if (!mounted) {
    return (
      loadingFallback ?? (
        <div
          className="
            min-h-screen flex items-center justify-center
            bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#FBF1D2_0%,#F0DAA5_55%,#DCB87C_100%)]
          "
        >
          <span className="w-5 h-5 rounded-full border-2 border-wood-dark/40 border-r-transparent animate-spin" />
        </div>
      )
    )
  }

  if (!user) {
    if (whenAnonymous === 'redirect') return null
    return <UnauthorizedView next={pathname ?? undefined} />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <ForbiddenView currentRole={user.role} requiredRoles={roles} />
  }

  return <>{children}</>
}
