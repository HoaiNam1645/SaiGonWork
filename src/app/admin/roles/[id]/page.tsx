'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import SearchInput from '@/components/admin/ui/SearchInput'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

interface RoleDetail {
  id:              string
  key:             string
  name:            string
  description:     string | null
  isSystem:        boolean
  userCount:       number
  permissionCount: number
  permissionIds:   string[]
}

interface Permission {
  id:           string
  key:          string
  method:       string
  path:         string
  module:       string | null
  description:  string | null
  isDeprecated: boolean
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'text-blue-600',
  POST:   'text-green-600',
  PUT:    'text-amber-600',
  PATCH:  'text-amber-600',
  DELETE: 'text-red-600',
}

export default function AdminRoleDetailPage() {
  const { t }    = useI18n()
  const router   = useRouter()
  const params   = useParams<{ id: string }>()
  const roleId   = params.id

  const [role,    setRole]    = useState<RoleDetail | null>(null)
  const [perms,   setPerms]   = useState<Permission[] | null>(null)
  const [selected,setSelected]= useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [savedMsg,setSavedMsg]= useState<string | null>(null)

  // Edit metadata
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const [rRes, pRes] = await Promise.all([
          api<{ role: RoleDetail }>(`/admin/roles/${roleId}`),
          api<{ permissions: Permission[] }>('/admin/permissions'),
        ])
        if (!alive) return
        setRole(rRes.role)
        setPerms(pRes.permissions)
        setSelected(new Set(rRes.role.permissionIds))
        setName(rRes.role.name)
        setDesc(rRes.role.description ?? '')
      } catch (e) {
        if (alive) setError(e instanceof ApiError ? e.message : 'Failed')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [roleId])

  const filtered = useMemo(() => {
    if (!perms) return []
    const q = search.trim().toLowerCase()
    if (!q) return perms
    return perms.filter(p =>
      p.key.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.module ?? '').toLowerCase().includes(q),
    )
  }, [perms, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of filtered) {
      const k = p.module ?? '_other'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleModule(moduleKeys: string[]) {
    setSelected(prev => {
      const next = new Set(prev)
      const allSelected = moduleKeys.every(id => next.has(id))
      if (allSelected) {
        moduleKeys.forEach(id => next.delete(id))
      } else {
        moduleKeys.forEach(id => next.add(id))
      }
      return next
    })
  }

  async function save() {
    if (!role) return
    setSaving(true); setSavedMsg(null); setError(null)
    try {
      // Save metadata if changed
      if (name !== role.name || (desc ?? '') !== (role.description ?? '')) {
        await api(`/admin/roles/${role.id}`, {
          method: 'PATCH',
          body: { name: name.trim(), description: desc.trim() || null },
        })
      }
      // Save permissions
      await api(`/admin/roles/${role.id}/permissions`, {
        method: 'PUT',
        body:   { permissionIds: Array.from(selected) },
      })
      setSavedMsg(t('admin.role.saved'))
      // Refresh
      const rRes = await api<{ role: RoleDetail }>(`/admin/roles/${roleId}`)
      setRole(rRes.role)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !role) {
    return (
      <>
        <AdminPageHeader eyebrow="Admin" title={t('admin.nav.roles')} />
        <div className="text-center text-gray-500 text-sm py-16">…</div>
      </>
    )
  }

  const totalSelected = selected.size

  return (
    <>
      <AdminPageHeader
        eyebrow={<Link href="/admin/roles" className="hover:text-brand-500">← {t('admin.nav.roles')}</Link>}
        title={role.name}
        subtitle={role.isSystem ? `${role.key} · ${t('admin.role.system')}` : role.key}
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? t('admin.role.saving') : t('admin.role.save')}
          </button>
        }
      />

      {error && <div className="mb-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm px-3 py-2">{error}</div>}
      {savedMsg && <div className="mb-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm px-3 py-2">{savedMsg}</div>}

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* Sidebar: metadata */}
        <aside className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">{t('admin.role.field.name')}</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={role.isSystem}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">{t('admin.role.field.description')}</span>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                maxLength={255}
                disabled={role.isSystem}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>{t('admin.role.col.users')}</span>
              <span className="font-medium text-gray-800 tabular-nums">{role.userCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('admin.role.col.permissions')}</span>
              <span className="font-medium text-gray-800 tabular-nums">{totalSelected} / {perms?.length ?? 0}</span>
            </div>
          </div>

          {role.isSystem && (
            <div className="text-[11px] text-gray-500 italic">{t('admin.role.system_note')}</div>
          )}

          {router && <span className="hidden" />}
        </aside>

        {/* Main: permission tree */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <SearchInput value={search} onChange={setSearch} placeholder={t('admin.perm.search_ph')} />
          </div>

          {grouped.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-16">{t('admin.perm.empty')}</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {grouped.map(([moduleName, ps]) => {
                const moduleIds   = ps.map(p => p.id)
                const checked     = moduleIds.every(id => selected.has(id))
                const indeterminate = !checked && moduleIds.some(id => selected.has(id))
                return (
                  <div key={moduleName}>
                    <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          ref={el => { if (el) el.indeterminate = indeterminate }}
                          onChange={() => toggleModule(moduleIds)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">{moduleName}</span>
                        <span className="text-xs text-gray-400 tabular-nums">({ps.filter(p => selected.has(p.id)).length}/{ps.length})</span>
                      </label>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {ps.map(p => (
                        <label key={p.id} className={`px-5 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-gray-50/60 ${p.isDeprecated ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggle(p.id)}
                            disabled={p.isDeprecated}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-sm font-mono font-medium text-gray-800">{p.key}</code>
                              <span className={`text-[10px] uppercase font-semibold tracking-wider ${METHOD_COLORS[p.method] ?? 'text-gray-500'}`}>
                                {p.method}
                              </span>
                              {p.isDeprecated && (
                                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                  deprecated
                                </span>
                              )}
                            </div>
                            {p.description && <div className="text-xs text-gray-600 mt-0.5">{p.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
