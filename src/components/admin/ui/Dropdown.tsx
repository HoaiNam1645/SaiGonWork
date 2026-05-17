'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  trigger:      ReactNode
  align?:       'left' | 'right'
  /** Width của menu — CSS value (vd "12rem", "200px") */
  width?:       string
  children:     ReactNode
}

/**
 * Generic dropdown menu render qua React portal để KHÔNG bị clip bởi parent
 * `overflow: hidden|auto` (table với overflow-x-auto thường gây vấn đề này).
 *
 * Vị trí menu: `position: fixed` dưới trigger, lấy coords từ
 * `trigger.getBoundingClientRect()`. Tự reposition khi scroll/resize.
 * Click outside cả trigger + menu → đóng. ESC → đóng.
 *
 * Caller controlled state: truyền `open` và `onOpenChange`.
 */
export default function Dropdown({
  open, onOpenChange, trigger, align = 'right', width = '12rem', children,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)
  const [pos, setPos]     = useState<{ top: number; left?: number; right?: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Mounted flag để createPortal chạy sau hydration (tránh SSR mismatch)
  useEffect(() => { setMounted(true) }, [])

  // Tính vị trí menu dựa trên trigger rect. Reposition khi scroll/resize.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    function compute() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const next: { top: number; left?: number; right?: number } = { top: r.bottom + 4 }
      if (align === 'right') {
        next.right = window.innerWidth - r.right
      } else {
        next.left = r.left
      }
      setPos(next)
    }
    compute()
    // Capture mode để bắt scroll của parent containers (vd table overflow-x-auto)
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [open, align])

  // Click outside cả trigger + menu → close
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t))    return
      onOpenChange(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onOpenChange])

  // ESC → close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const menu = open && pos && (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top:      pos.top,
        left:     pos.left,
        right:    pos.right,
        width,
        minWidth: width,
        zIndex:   50,
      }}
      className="rounded-lg border border-gray-200 bg-white shadow-lg shadow-gray-200/40 py-1"
    >
      {children}
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  )
}

// ===== Items =====

interface ItemProps {
  onClick:   () => void
  children:  ReactNode
  icon?:     ReactNode
  variant?:  'default' | 'danger'
  disabled?: boolean
}

export function DropdownItem({ onClick, children, icon, variant = 'default', disabled }: ItemProps) {
  const color =
    disabled                 ? 'text-gray-300 cursor-not-allowed' :
    variant === 'danger'     ? 'text-error-600 hover:bg-error-50' :
                               'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
  return (
    <button
      type="button"
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left text-sm px-3 py-2 inline-flex items-center gap-2 transition-colors ${color}`}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  )
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-gray-100" />
}
