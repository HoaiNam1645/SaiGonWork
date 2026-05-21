import { prisma } from '@/lib/prisma'
import { listAllPermissions, type PermissionDef } from '@/lib/permissionRegistry'

/**
 * Sync in-memory permission registry → DB.
 *
 * Quy tắc:
 *  - Key trong registry, chưa có trong DB → INSERT
 *  - Key có cả 2 chỗ, metadata khác → UPDATE (method/path/module/description) + clear is_deprecated
 *  - Key trong DB nhưng không còn trong registry → mark is_deprecated=true (KHÔNG delete để giữ ref role_permissions)
 *
 * Idempotent: chạy nhiều lần an toàn. Boot mỗi lần đều chạy.
 *
 * Trả về { added, updated, deprecated } để log.
 */
export interface SyncResult {
  added:      string[]
  updated:    string[]
  deprecated: string[]
  reactivated: string[]
}

export async function syncPermissionsFromRegistry(): Promise<SyncResult> {
  const registered = listAllPermissions()
  const registeredKeys = new Set(registered.map(p => p.key))

  // Load tất cả permission trong DB (kể cả deprecated)
  const dbRows = await prisma.permission.findMany({
    select: { id: true, key: true, method: true, path: true, module: true, description: true, isDeprecated: true },
  })
  const dbByKey = new Map(dbRows.map(r => [r.key, r]))

  const added:       string[] = []
  const updated:     string[] = []
  const reactivated: string[] = []
  const deprecated:  string[] = []

  // INSERT/UPDATE
  for (const def of registered) {
    const existing = dbByKey.get(def.key)
    if (!existing) {
      await prisma.permission.create({
        data: {
          key:         def.key,
          method:      def.method,
          path:        def.path,
          module:      def.module ?? null,
          description: def.description ?? null,
        },
      })
      added.push(def.key)
      continue
    }

    const diff = metadataChanged(existing, def)
    const wasDeprecated = existing.isDeprecated
    if (diff || wasDeprecated) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: {
          method:       def.method,
          path:         def.path,
          module:       def.module ?? null,
          description:  def.description ?? null,
          isDeprecated: false,
        },
      })
      if (wasDeprecated) reactivated.push(def.key)
      if (diff)          updated.push(def.key)
    }
  }

  // Mark deprecated: row tồn tại DB nhưng không còn registered, chưa bị mark trước đó
  for (const row of dbRows) {
    if (!registeredKeys.has(row.key) && !row.isDeprecated) {
      await prisma.permission.update({
        where: { id: row.id },
        data:  { isDeprecated: true },
      })
      deprecated.push(row.key)
    }
  }

  return { added, updated, deprecated, reactivated }
}

function metadataChanged(
  db:  { method: string; path: string; module: string | null; description: string | null },
  def: PermissionDef,
): boolean {
  return (
    db.method      !== def.method ||
    db.path        !== def.path   ||
    db.module      !== (def.module      ?? null) ||
    db.description !== (def.description ?? null)
  )
}
