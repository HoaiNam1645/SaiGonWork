import { Router } from 'express'
import * as rolesApi      from '@/api/admin.roles.api'
import * as userRolesApi  from '@/api/admin.userRoles.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

// ─── Roles ───
definePermission('roles.list',            { method: 'GET',    path: '/api/admin/roles',                  module: 'rbac', description: 'Xem danh sách role' })
definePermission('roles.create',          { method: 'POST',   path: '/api/admin/roles',                  module: 'rbac', description: 'Tạo role mới' })
definePermission('roles.read',            { method: 'GET',    path: '/api/admin/roles/:id',              module: 'rbac', description: 'Xem chi tiết role' })
definePermission('roles.update',          { method: 'PATCH',  path: '/api/admin/roles/:id',              module: 'rbac', description: 'Sửa role' })
definePermission('roles.set_permissions', { method: 'PUT',    path: '/api/admin/roles/:id/permissions',  module: 'rbac', description: 'Gán permissions cho role' })
definePermission('roles.delete',          { method: 'DELETE', path: '/api/admin/roles/:id',              module: 'rbac', description: 'Xóa role' })

// ─── User-role assignment ───
definePermission('users.read_roles', { method: 'GET', path: '/api/admin/users/:id/roles', module: 'rbac', description: 'Xem roles của user' })
definePermission('users.set_roles',  { method: 'PUT', path: '/api/admin/users/:id/roles', module: 'rbac', description: 'Gán roles cho user' })

export const adminRolesRouter      = Router()
export const adminUserRolesRouter  = Router()

adminRolesRouter.use(requireAuth)        // Permission check ở từng route
adminUserRolesRouter.use(requireAuth)

// /api/admin/roles
adminRolesRouter.get   ('/',                requirePermission('roles.list'),            ah(rolesApi.list))
adminRolesRouter.post  ('/',                requirePermission('roles.create'),          ah(rolesApi.create))
adminRolesRouter.get   ('/:id',             requirePermission('roles.read'),            ah(rolesApi.getOne))
adminRolesRouter.patch ('/:id',             requirePermission('roles.update'),          ah(rolesApi.update))
adminRolesRouter.put   ('/:id/permissions', requirePermission('roles.set_permissions'), ah(rolesApi.setPermissions))
adminRolesRouter.delete('/:id',             requirePermission('roles.delete'),          ah(rolesApi.remove))

// /api/admin/users/:id/roles  (mount path khác, dùng adminUserRolesRouter)
adminUserRolesRouter.get('/:id/roles', requirePermission('users.read_roles'), ah(userRolesApi.getUserRoles))
adminUserRolesRouter.put('/:id/roles', requirePermission('users.set_roles'),  ah(userRolesApi.setUserRoles))
