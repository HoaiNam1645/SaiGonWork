'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nContext'
import { IconBell } from './AdminIcons'
import { api, ApiError } from '@/lib/api'
import {
  useStaffOrdersSocket,
  type NotificationPayload,
  type NotificationType,
} from '@/lib/socket'

// =====================================================================
// Types
// =====================================================================

interface ListResponse {
  notifications: NotificationPayload[]
  total:         number
  unread:        number
  limit:         number
  offset:        number
}

const STATUS_LABEL_KEY: Record<string, string> = {
  pending_payment: 'admin.status.pending_payment',
  paid:            'admin.status.paid',
  preparing:       'admin.status.preparing',
  delivering:      'admin.status.delivering',
  completed:       'admin.status.completed',
  cancelled:       'admin.status.cancelled',
}

const TYPE_ICON: Record<NotificationType, 'order' | 'payment' | 'alert' | 'system'> = {
  order_created:         'order',
  order_status_changed:  'system',
  order_cancelled:       'alert',
  payment_received:      'payment',
  low_stock:             'alert',
  new_customer:          'system',
  system:                'system',
}

const ICON_STYLES: Record<'order' | 'payment' | 'alert' | 'system', { bg: string; fg: string }> = {
  order:   { bg: 'bg-brand-50',   fg: 'text-brand-600'   },
  payment: { bg: 'bg-success-50', fg: 'text-success-600' },
  alert:   { bg: 'bg-warning-50', fg: 'text-warning-600' },
  system:  { bg: 'bg-gray-100',   fg: 'text-gray-600'    },
}

// =====================================================================
// Render label/body theo type + metadata
// =====================================================================

interface RenderedText { title: string; body: string }

function renderNotification(
  n: NotificationPayload,
  t: (k: string) => string,
): RenderedText {
  const m = (n.metadata ?? {}) as Record<string, unknown>
  const code = (m.code as string) ?? ''

  switch (n.type) {
    case 'order_created': {
      const total = typeof m.total === 'number' ? m.total : 0
      const name  = (m.contactName as string) ?? ''
      const status = (m.status as string) ?? ''
      return {
        title: t('admin.notif.new_order').replace('{{code}}', code),
        body:  `${name} · ${formatEuro(total)} · ${t((STATUS_LABEL_KEY[status] ?? 'admin.status.pending_payment'))}`,
      }
    }
    case 'order_status_changed':
    case 'payment_received':
    case 'order_cancelled': {
      const from = (m.from as string) ?? ''
      const to   = (m.to as string) ?? ''
      const toLabel   = t((STATUS_LABEL_KEY[to]   ?? 'admin.status.pending_payment'))
      const fromLabel = from ? t((STATUS_LABEL_KEY[from] ?? 'admin.status.pending_payment')) : '—'
      return {
        title: t('admin.notif.status_changed').replace('{{code}}', code).replace('{{to}}', toLabel),
        body:  t('admin.notif.from_to').replace('{{from}}', fromLabel).replace('{{to}}', toLabel),
      }
    }
    default:
      return { title: n.type, body: '' }
  }
}

function formatEuro(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`
}

function TypeIcon({ type }: { type: NotificationType }) {
  const ui = TYPE_ICON[type]
  const s  = ICON_STYLES[ui]
  const path =
    ui === 'order'
      ? <><path d="M5 6h14l-1.5 12.5a2 2 0 0 1-2 1.5h-7a2 2 0 0 1-2-1.5L5 6Z" /><path d="M9 9V5a3 3 0 0 1 6 0v4" /></>
      : ui === 'payment'
      ? <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>
      : ui === 'alert'
      ? <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.86l-8.5 14a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-14a2 2 0 0 0-3.4 0Z" /></>
      : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 2" /></>
  return (
    <span className={`inline-flex shrink-0 w-9 h-9 rounded-full items-center justify-center ${s.bg} ${s.fg}`}>
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  )
}

// =====================================================================
// Component
// =====================================================================

export default function NotificationDropdown() {
  const { t } = useI18n()
  const router = useRouter()
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const [unread, setUnread]               = useState(0)
  const [loaded, setLoaded]               = useState(false)
  // Re-render định kỳ để cập nhật relative time
  const [, forceTick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => forceTick(v => v + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  // ─── Initial fetch + refetch khi mở dropdown nếu chưa load ───
  const fetchList = useCallback(async () => {
    try {
      const res = await api<ListResponse>('/notifications?limit=50')
      setNotifications(res.notifications)
      setUnread(res.unread)
      setLoaded(true)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Chưa login → silent
        setLoaded(true)
        return
      }
      console.warn('[notif] fetch failed:', e)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api<{ count: number }>('/notifications/unread-count')
      setUnread(res.count)
    } catch {
      // silent
    }
  }, [])

  // Lần đầu mount: chỉ fetch unread count cho badge (tiết kiệm). List load khi mở.
  useEffect(() => { void fetchUnreadCount() }, [fetchUnreadCount])

  // Khi open lần đầu → load full list
  useEffect(() => {
    if (open && !loaded) void fetchList()
  }, [open, loaded, fetchList])

  // ─── Socket realtime: prepend + bump unread ───
  const onNotification = useCallback((p: NotificationPayload) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === p.id)) return prev
      return [p, ...prev].slice(0, 50)
    })
    setUnread(c => c + 1)
  }, [])

  useStaffOrdersSocket({ onNotification })

  // Click outside / ESC
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function relativeTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60)    return t('admin.notif.time.just_now')
    if (diff < 3600)  return t('admin.notif.time.min_ago').replace('{{n}}', String(Math.floor(diff / 60)))
    if (diff < 86400) return t('admin.notif.time.hour_ago').replace('{{n}}', String(Math.floor(diff / 3600)))
    return t('admin.notif.time.day_ago').replace('{{n}}', String(Math.floor(diff / 86400)))
  }

  async function markRead(n: NotificationPayload) {
    if (n.isRead) return
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
    setUnread(c => Math.max(0, c - 1))
    try {
      await api(`/notifications/${n.id}/read`, { method: 'POST' })
    } catch (e) {
      console.warn('[notif] mark read failed:', e)
    }
  }

  async function markAllRead() {
    if (unread === 0) return
    setNotifications(prev => prev.map(x => ({ ...x, isRead: true })))
    setUnread(0)
    try {
      await api('/notifications/read-all', { method: 'POST' })
    } catch (e) {
      console.warn('[notif] mark all read failed:', e)
    }
  }

  function onClickItem(n: NotificationPayload) {
    void markRead(n)
    if (n.actionUrl) {
      setOpen(false)
      router.push(n.actionUrl)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t('admin.topbar.notifications')}
        aria-expanded={open}
        className="relative w-10 h-10 rounded-full inline-flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
      >
        <IconBell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error-500 text-white text-[10px] font-semibold ring-2 ring-white inline-flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="
            absolute right-0 mt-2 w-[360px] sm:w-[380px] rounded-xl bg-white z-50
            border border-gray-200
            shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('admin.topbar.notifications')}
              </h3>
              {unread > 0 && (
                <span className="text-[10px] font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                  {unread} {t('admin.notif.badge_new')}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[12px] font-medium text-gray-500 hover:text-brand-500 transition"
              >
                {t('admin.notif.mark_all_read')}
              </button>
            )}
          </div>

          {/* List */}
          {!loaded ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">…</div>
          ) : notifications.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {notifications.map(n => {
                const text = renderNotification(n, t)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onClickItem(n)}
                      className={`
                        w-full flex items-start gap-3 px-4 py-3 text-left
                        hover:bg-gray-50 transition
                        border-b border-gray-100 last:border-b-0
                        ${!n.isRead ? 'bg-brand-25/40' : ''}
                      `}
                    >
                      <TypeIcon type={n.type} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="text-[13px] font-semibold text-gray-900 leading-snug truncate flex-1">
                            {text.title}
                          </div>
                          {!n.isRead && (
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                          )}
                        </div>
                        {text.body && (
                          <div className="mt-0.5 text-[12px] text-gray-600 line-clamp-2">
                            {text.body}
                          </div>
                        )}
                        <div className="mt-1 text-[11px] text-gray-400">
                          {relativeTime(n.createdAt)}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Empty state
// =====================================================================

function EmptyState({ t }: { t: (k: string) => string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2z" />
          <path d="M9 20a3 3 0 0 0 6 0" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">{t('admin.notif.empty.title')}</p>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{t('admin.notif.empty.body')}</p>
    </div>
  )
}
