import { Router } from 'express'
import * as catApi    from '@/api/admin.categories.api'
import * as dishApi   from '@/api/admin.dishes.api'
import * as optApi    from '@/api/admin.options.api'
import { requireAuth } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'
import { requirePermission } from '@/middleware/permission'
import { definePermission } from '@/lib/permissionRegistry'

/**
 * Catalog management (admin-only) — categories, dishes, options, option values.
 */

// ─── Categories ──────────────────────────────────────────
definePermission('categories.list',   { method: 'GET',    path: '/api/admin/categories',         module: 'menu', description: 'Xem danh sách danh mục' })
definePermission('categories.create', { method: 'POST',   path: '/api/admin/categories',         module: 'menu', description: 'Tạo danh mục mới' })
definePermission('categories.update', { method: 'PATCH',  path: '/api/admin/categories/:id',     module: 'menu', description: 'Sửa danh mục' })
definePermission('categories.delete', { method: 'DELETE', path: '/api/admin/categories/:id',     module: 'menu', description: 'Xóa danh mục' })
definePermission('categories.reorder',{ method: 'POST',   path: '/api/admin/categories/:id/reorder', module: 'menu', description: 'Sắp xếp lại danh mục' })

// ─── Dishes ──────────────────────────────────────────────
definePermission('dishes.list',                { method: 'GET',    path: '/api/admin/dishes',                          module: 'menu', description: 'Xem danh sách món' })
definePermission('dishes.create',              { method: 'POST',   path: '/api/admin/dishes',                          module: 'menu', description: 'Tạo món mới' })
definePermission('dishes.read',                { method: 'GET',    path: '/api/admin/dishes/:id',                      module: 'menu', description: 'Xem chi tiết món' })
definePermission('dishes.update',              { method: 'PATCH',  path: '/api/admin/dishes/:id',                      module: 'menu', description: 'Sửa thông tin món' })
definePermission('dishes.delete',              { method: 'DELETE', path: '/api/admin/dishes/:id',                      module: 'menu', description: 'Xóa món' })
definePermission('dishes.toggle_availability', { method: 'POST',   path: '/api/admin/dishes/:id/toggle-availability',  module: 'menu', description: 'Bật/tắt sẵn có món' })
definePermission('dishes.toggle_featured',     { method: 'POST',   path: '/api/admin/dishes/:id/toggle-featured',      module: 'menu', description: 'Bật/tắt nổi bật' })

// ─── Options ─────────────────────────────────────────────
definePermission('options.list_for_dish',  { method: 'GET',    path: '/api/admin/dishes/:dishId/options',  module: 'menu', description: 'Xem options của 1 món' })
definePermission('options.create',         { method: 'POST',   path: '/api/admin/dishes/:dishId/options',  module: 'menu', description: 'Tạo option mới cho món' })
definePermission('options.update',         { method: 'PATCH',  path: '/api/admin/options/:id',             module: 'menu', description: 'Sửa option' })
definePermission('options.delete',         { method: 'DELETE', path: '/api/admin/options/:id',             module: 'menu', description: 'Xóa option' })
definePermission('options.create_value',   { method: 'POST',   path: '/api/admin/options/:optionId/values', module: 'menu', description: 'Tạo giá trị cho option' })

// ─── Values ──────────────────────────────────────────────
definePermission('values.update', { method: 'PATCH',  path: '/api/admin/values/:id', module: 'menu', description: 'Sửa giá trị option' })
definePermission('values.delete', { method: 'DELETE', path: '/api/admin/values/:id', module: 'menu', description: 'Xóa giá trị option' })

const auth = [requireAuth]   // Permission check ở từng route

export const adminCategoriesRouter = Router()
adminCategoriesRouter.use(...auth)
adminCategoriesRouter.get   ('/',             requirePermission('categories.list'),   ah(catApi.list))
adminCategoriesRouter.post  ('/',             requirePermission('categories.create'), ah(catApi.create))
adminCategoriesRouter.patch ('/:id',          requirePermission('categories.update'), ah(catApi.update))
adminCategoriesRouter.delete('/:id',          requirePermission('categories.delete'), ah(catApi.remove))
adminCategoriesRouter.post  ('/:id/reorder',  requirePermission('categories.reorder'),ah(catApi.reorder))

export const adminDishesRouter = Router()
adminDishesRouter.use(...auth)
adminDishesRouter.get   ('/',                        requirePermission('dishes.list'),                ah(dishApi.list))
adminDishesRouter.post  ('/',                        requirePermission('dishes.create'),              ah(dishApi.create))
adminDishesRouter.get   ('/:id',                     requirePermission('dishes.read'),                ah(dishApi.getOne))
adminDishesRouter.patch ('/:id',                     requirePermission('dishes.update'),              ah(dishApi.update))
adminDishesRouter.delete('/:id',                     requirePermission('dishes.delete'),              ah(dishApi.remove))
adminDishesRouter.post  ('/:id/toggle-availability', requirePermission('dishes.toggle_availability'), ah(dishApi.toggleAvailability))
adminDishesRouter.post  ('/:id/toggle-featured',     requirePermission('dishes.toggle_featured'),     ah(dishApi.toggleFeatured))
adminDishesRouter.get   ('/:dishId/options',         requirePermission('options.list_for_dish'),      ah(optApi.listForDish))
adminDishesRouter.post  ('/:dishId/options',         requirePermission('options.create'),             ah(optApi.createOption))

export const adminOptionsRouter = Router()
adminOptionsRouter.use(...auth)
adminOptionsRouter.patch ('/:id',                requirePermission('options.update'),       ah(optApi.updateOption))
adminOptionsRouter.delete('/:id',                requirePermission('options.delete'),       ah(optApi.deleteOption))
adminOptionsRouter.post  ('/:optionId/values',   requirePermission('options.create_value'), ah(optApi.createValue))

export const adminValuesRouter = Router()
adminValuesRouter.use(...auth)
adminValuesRouter.patch ('/:id', requirePermission('values.update'), ah(optApi.updateValue))
adminValuesRouter.delete('/:id', requirePermission('values.delete'), ah(optApi.deleteValue))
