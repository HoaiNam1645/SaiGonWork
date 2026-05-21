'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

/**
 * Inline card cho admin/customers/[id] và admin/staff/[id]:
 *  - List roles đã assign + checkbox toggle
 *  - Save với debounce minimal (button explicit để admin xác nhận)
 *
 * Tích hợp:
 *   <UserRolesPicker userId={c.id} />
 */
interface Role {
  id:          string
  key:         string
  name:        string
  description: string | null
  isSystem:    boolean
}

interface AllRolesResponse  { roles: Role[] }
interface UserRolesResponse { roles: Role[] }

interface Props {
  userId: string
}

export default function UserRolesPicker({ userId }: Props) {
  const { t } = useI18n()
  const [allRoles, setAllRoles] = useState<Role[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initial,  setInitial]  = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const [all, mine] = await Promise.all([
          api<AllRolesResponse>('/admin/roles'),
          api<UserRolesResponse>(`/admin/users/${userId}/roles`),
        ])
        if (!alive) return
        setAllRoles(all.roles)
        const ids = new Set(mine.roles.map(r => r.id))
        setSelected(ids)
        setInitial(ids)
      } catch (e) {
        if (alive) setError(e instanceof ApiError ? e.message : 'Failed')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [userId])

  const dirty = !setsEqual(selected, initial)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true); setError(null); setSavedMsg(null)
    try {
      await api(`/admin/users/${userId}/roles`, {
        method: 'PUT',
        body:   { roleIds: Array.from(selected) },
      })
      setInitial(new Set(selected))
      setSavedMsg(t('admin.role.saved'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{t('admin.user_roles.title')}</h3>
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg"
          >
            {saving ? t('admin.role.saving') : t('admin.role.save')}
          </button>
        )}
      </div>

      {error    && <div className="mb-3 rounded-lg bg-error-50   border border-error-200   text-error-700   text-xs px-3 py-2">{error}</div>}
      {savedMsg && <div className="mb-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-xs px-3 py-2">{savedMsg}</div>}

      {loading || !allRoles ? (
        <div className="text-xs text-gray-500 py-4">…</div>
      ) : (
        <div className="space-y-1.5">
          {allRoles.map(r => (
            <label key={r.id} className="flex items-start gap-2.5 py-1.5 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                  {r.isSystem && (
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {t('admin.role.system')}
                    </span>
                  )}
                </div>
                {r.description && <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}
