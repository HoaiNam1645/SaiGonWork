import { Router } from 'express'
import * as catApi    from '@/api/admin.categories.api'
import * as dishApi   from '@/api/admin.dishes.api'
import * as optApi    from '@/api/admin.options.api'
import { requireAuth, requireRole } from '@/middleware/auth'
import { ah } from '@/lib/asyncHandler'

/**
 * Catalog management (admin-only) — categories, dishes, options, option values.
 *
 * Mount points (xem routes/index.ts):
 *   /api/admin/categories
 *   /api/admin/dishes
 *   /api/admin/options + /values
 *   /api/admin/dishes/:dishId/options (list/create)
 */

const auth = [requireAuth, requireRole('admin')]

// --- Categories ---
export const adminCategoriesRouter = Router()
adminCategoriesRouter.use(...auth)
adminCategoriesRouter.get   ('/',             ah(catApi.list))
adminCategoriesRouter.post  ('/',             ah(catApi.create))
adminCategoriesRouter.patch ('/:id',          ah(catApi.update))
adminCategoriesRouter.delete('/:id',          ah(catApi.remove))
adminCategoriesRouter.post  ('/:id/reorder',  ah(catApi.reorder))

// --- Dishes ---
export const adminDishesRouter = Router()
adminDishesRouter.use(...auth)
adminDishesRouter.get   ('/',                              ah(dishApi.list))
adminDishesRouter.post  ('/',                              ah(dishApi.create))
adminDishesRouter.get   ('/:id',                           ah(dishApi.getOne))
adminDishesRouter.patch ('/:id',                           ah(dishApi.update))
adminDishesRouter.delete('/:id',                           ah(dishApi.remove))
adminDishesRouter.post  ('/:id/toggle-availability',       ah(dishApi.toggleAvailability))
adminDishesRouter.post  ('/:id/toggle-featured',           ah(dishApi.toggleFeatured))
// Options nested dưới dish — list + create
adminDishesRouter.get   ('/:dishId/options',               ah(optApi.listForDish))
adminDishesRouter.post  ('/:dishId/options',               ah(optApi.createOption))

// --- Options (standalone — update/delete by id) ---
export const adminOptionsRouter = Router()
adminOptionsRouter.use(...auth)
adminOptionsRouter.patch ('/:id',                ah(optApi.updateOption))
adminOptionsRouter.delete('/:id',                ah(optApi.deleteOption))
adminOptionsRouter.post  ('/:optionId/values',   ah(optApi.createValue))

// --- Values (standalone — update/delete by id) ---
export const adminValuesRouter = Router()
adminValuesRouter.use(...auth)
adminValuesRouter.patch ('/:id', ah(optApi.updateValue))
adminValuesRouter.delete('/:id', ah(optApi.deleteValue))
