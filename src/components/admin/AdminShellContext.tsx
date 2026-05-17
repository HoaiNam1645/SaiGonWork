'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface ShellState {
  collapsed: boolean
  toggleCollapsed: () => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const ShellContext = createContext<ShellState | null>(null)
const STORAGE_KEY = 'sgw-admin-sidebar-collapsed'

export function AdminShellProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === '1') setCollapsed(true)
    } catch {}
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  return (
    <ShellContext.Provider value={{ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </ShellContext.Provider>
  )
}

export function useAdminShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useAdminShell must be used within AdminShellProvider')
  return ctx
}
