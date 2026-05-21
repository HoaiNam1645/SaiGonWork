/**
 * Permission registry — in-memory store cho tất cả permission key được khai báo
 * trong code. Sync vào DB lúc server boot (xem permissionSync.ts).
 *
 * Flow:
 *   1. File route gọi `definePermission('orders.admin.list', {...})` ở top-level
 *   2. Module được load lúc app start → entry vào REGISTRY
 *   3. server.ts gọi `syncPermissionsFromRegistry()` sau khi tất cả route load xong
 *   4. Sync: INSERT mới, UPDATE metadata thay đổi, mark `is_deprecated=true` cho
 *      permission tồn tại trong DB nhưng không còn trong code.
 *
 * KHÔNG xóa permission khỏi DB vì còn ref từ role_permissions → soft-delete bằng
 * `is_deprecated` flag. Admin UI hide deprecated entries.
 */

export interface PermissionDef {
  key:         string
  method:      string   // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path:        string   // '/api/orders/admin/list' — bao gồm /api prefix
  module?:     string   // 'orders' | 'menu' | 'users'... để group ở UI
  description?: string
}

const REGISTRY = new Map<string, PermissionDef>()

export function definePermission(key: string, def: Omit<PermissionDef, 'key'>): void {
  if (REGISTRY.has(key)) {
    // Trùng key → warning, KHÔNG override. Lý do: bug dễ phát hiện hơn là silent override.
    console.warn(`[permissionRegistry] Duplicate permission key: "${key}" — bỏ qua lần đăng ký sau.`)
    return
  }
  REGISTRY.set(key, { key, ...def })
}

export function getRegistry(): ReadonlyMap<string, PermissionDef> {
  return REGISTRY
}

export function listAllPermissions(): PermissionDef[] {
  return Array.from(REGISTRY.values())
}
