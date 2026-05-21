'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/admin/ui/Table'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

interface Role {
  id:              string
  key:             string
  name:            string
  description:     string | null
  isSystem:        boolean
  userCount:       number
  permissionCount: number
  createdAt:       string
  updatedAt:       string
}

interface ListResponse { roles: Role[] }

export default function AdminRolesPage() {
  const { t } = useI18n()
  const [roles,   setRoles]   = useState<Role[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const [createOpen, setCreateOpen]   = useState(false)
  const [newKey,     setNewKey]       = useState('')
  const [newName,    setNewName]      = useState('')
  const [newDesc,    setNewDesc]      = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitErr,  setSubmitErr]    = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true); setError(null)
      try {
        const res = await api<ListResponse>('/admin/roles')
        if (alive) setRoles(res.roles)
      } catch (e) {
        if (alive) setError(e instanceof ApiError ? e.message : 'Failed')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [tick])

  async function createRole() {
    setSubmitting(true); setSubmitErr(null)
    try {
      await api('/admin/roles', {
        method: 'POST',
        body:   { key: newKey.trim(), name: newName.trim(), description: newDesc.trim() || null },
      })
      setCreateOpen(false)
      setNewKey(''); setNewName(''); setNewDesc('')
      setTick(x => x + 1)
    } catch (e) {
      setSubmitErr(e instanceof ApiError ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRole(r: Role) {
    if (!confirm(t('admin.role.confirm_delete').replace('{{name}}', r.name))) return
    try {
      await api(`/admin/roles/${r.id}`, { method: 'DELETE' })
      setTick(x => x + 1)
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed')
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.nav.roles')}
        subtitle={t('admin.role.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => { setCreateOpen(true); setSubmitErr(null) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t('admin.role.new')}
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        {loading && !roles ? (
          <div className="text-center text-gray-500 text-sm py-16">…</div>
        ) : error ? (
          <div className="text-center text-error-600 text-sm py-16">{error}</div>
        ) : !roles || roles.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">{t('admin.role.empty')}</div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50/60">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.role.col.name')}</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-start">{t('admin.role.col.key')}</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-end">{t('admin.role.col.users')}</TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-[12px] uppercase tracking-wider text-end">{t('admin.role.col.permissions')}</TableCell>
                <TableCell isHeader className="px-5 py-3"><span className="sr-only">Actions</span></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {roles.map(r => (
                <TableRow key={r.id} className="hover:bg-gray-50">
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/roles/${r.id}`} className="text-sm font-medium text-gray-800 hover:text-brand-500">{r.name}</Link>
                      {r.isSystem && (
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {t('admin.role.system')}
                        </span>
                      )}
                    </div>
                    {r.description && <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <code className="text-xs font-mono text-gray-600">{r.key}</code>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right text-sm text-gray-700 tabular-nums">{r.userCount}</TableCell>
                  <TableCell className="px-5 py-4 text-right text-sm text-gray-700 tabular-nums">{r.permissionCount}</TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/roles/${r.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                        aria-label="Edit"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                      {!r.isSystem && r.userCount === 0 && (
                        <button
                          type="button"
                          onClick={() => void deleteRole(r)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-error-50 hover:border-error-200 hover:text-error-600 transition-colors"
                          aria-label="Delete"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !submitting && setCreateOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">{t('admin.role.create_title')}</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1.5">{t('admin.role.field.key')} <span className="text-error-500">*</span></span>
                <input
                  type="text"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="kitchen-manager"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono outline-none focus:border-brand-500"
                />
                <span className="block text-[11px] text-gray-400 mt-1">{t('admin.role.field.key_hint')}</span>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1.5">{t('admin.role.field.name')} <span className="text-error-500">*</span></span>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Quản lý bếp"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1.5">{t('admin.role.field.description')}</span>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  maxLength={255}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500 resize-none"
                />
              </label>
              {submitErr && <div className="rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm px-3 py-2">{submitErr}</div>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50">
                {t('admin.role.cancel')}
              </button>
              <button type="button" onClick={createRole}
                disabled={submitting || newKey.length < 2 || newName.length < 2}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg">
                {submitting ? t('admin.role.saving') : t('admin.role.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
