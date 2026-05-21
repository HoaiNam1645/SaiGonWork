'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import SearchInput from '@/components/admin/ui/SearchInput'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

interface Permission {
  id:           string
  key:          string
  method:       string
  path:         string
  module:       string | null
  description:  string | null
  isDeprecated: boolean
}

interface ListResponse { permissions: Permission[] }

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-50 text-blue-600 border-blue-200',
  POST:   'bg-green-50 text-green-600 border-green-200',
  PUT:    'bg-amber-50 text-amber-600 border-amber-200',
  PATCH:  'bg-amber-50 text-amber-600 border-amber-200',
  DELETE: 'bg-red-50 text-red-600 border-red-200',
}

export default function AdminPermissionsPage() {
  const { t } = useI18n()
  const [data,    setData]    = useState<Permission[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await api<ListResponse>('/admin/permissions?includeDeprecated=true')
      setData(res.permissions)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function manualSync() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await api<{ added: string[]; updated: string[]; reactivated: string[]; deprecated: string[] }>('/admin/permissions/sync', { method: 'POST' })
      setSyncMsg(
        `Sync done — added=${res.added.length} updated=${res.updated.length} ` +
        `reactivated=${res.reactivated.length} deprecated=${res.deprecated.length}`,
      )
      await load()
    } catch (e) {
      setSyncMsg(e instanceof ApiError ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  // Filter + group theo module
  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(p =>
      p.key.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.module ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of filtered) {
      const k = p.module ?? '_other'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.nav.permissions')}
        subtitle={t('admin.perm.subtitle')}
        actions={
          <button
            type="button"
            onClick={manualSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {syncing ? t('admin.perm.syncing') : t('admin.perm.sync')}
          </button>
        }
      />

      {syncMsg && (
        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2">
          {syncMsg}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin.perm.search_ph')} />
        </div>

        {loading && !data ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">{t('admin.perm.empty')}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {grouped.map(([module, perms]) => (
              <ModuleGroup key={module} module={module} perms={perms} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ModuleGroup({ module, perms }: { module: string; perms: Permission[] }) {
  return (
    <div>
      <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">{module}</span>
          <span className="text-xs text-gray-400 tabular-nums">({perms.length})</span>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {perms.map(p => (
          <div key={p.id} className={`px-5 py-3 flex items-start gap-3 ${p.isDeprecated ? 'opacity-50' : ''}`}>
            <span className={`shrink-0 inline-flex items-center justify-center min-w-[52px] h-5 text-[10px] font-semibold uppercase tracking-wider px-1.5 rounded border ${METHOD_COLORS[p.method] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {p.method}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono font-medium text-gray-800">{p.key}</code>
                {p.isDeprecated && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    deprecated
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate font-mono">{p.path}</div>
              {p.description && (
                <div className="text-xs text-gray-600 mt-1">{p.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
