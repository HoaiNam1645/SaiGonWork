'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { api, ApiError } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: 'customer' | 'staff' | 'admin'
  emailVerifiedAt: string | null
}

interface AuthState {
  user:    AuthUser | null
  refresh: () => Promise<void>
  logout:  () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const STORAGE_KEY = 'sgw-auth-user'

function readSnapshot(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function writeSnapshot(user: AuthUser | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lazy init — chạy SYNCHRONOUSLY ngay render đầu tiên. Trên client, đọc localStorage
  // và trả snapshot luôn → user state ĐÚNG từ render đầu, không có "stuck loading".
  // Trên SSR/server, trả null. Hydration mismatch được handle bằng suppressHydrationWarning
  // ở component consumer.
  const [user, setUserState] = useState<AuthUser | null>(readSnapshot)

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u)
    writeSnapshot(u)
  }, [])

  const refresh = useCallback(async () => {
    // Thử /me. Nếu 401, thử refresh token rồi /me lại — robust với access token expired.
    try {
      const res = await api<{ user: AuthUser }>('/auth/me')
      setUser(res.user)
      return
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) {
        // Network/server lỗi khác — giữ snapshot, không clear
        return
      }
    }
    // 401 lần 1 → token có thể chỉ access hết hạn → thử refresh
    try {
      await api('/auth/refresh', { method: 'POST' })
      const res = await api<{ user: AuthUser }>('/auth/me')
      setUser(res.user)
    } catch (e) {
      // Refresh cũng fail (refresh_token hết hạn / cookie bị clear) → thực sự logout
      if (e instanceof ApiError && e.status === 401) {
        setUser(null)
      }
      // network error → giữ user state
    }
  }, [setUser])

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
  }, [setUser])

  // Validate với BE 1 lần khi mount
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Đồng bộ giữa các tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      try {
        setUserState(e.newValue ? (JSON.parse(e.newValue) as AuthUser) : null)
      } catch {
        setUserState(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Browser back/forward — re-sync snapshot phòng case bfcache hoặc Next/React không
  // unmount lại AuthProvider (giữ state cũ).
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const snap = readSnapshot()
      setUserState(prev => {
        if (prev?.id === snap?.id) return prev
        return snap
      })
      if (e.persisted) void refresh()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
