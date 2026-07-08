import { Router } from 'express'
import { healthRouter } from './health'
import { authRouter } from './auth'
import { categoriesRouter } from './categories'
import { dishesRouter } from './dishes'
import { storeRouter } from './store'
import { i18nRouter } from './i18n'
import { otpRouter } from './otp'
import { menuRouter } from './menu'
import { cartRouter } from './cart'
import { addressesRouter } from './addresses'
import { ordersRouter } from './orders'
import { notificationsRouter } from './notifications'
import { adminCustomersRouter } from './admin.customers'
import { adminStaffRouter } from './admin.staff'
import { adminPromotionsRouter } from './admin.promotions'
import { adminSettingsRouter } from './admin.settings'
import { adminPermissionsRouter } from './admin.permissions'
import { adminRolesRouter, adminUserRolesRouter } from './admin.roles'
import {
  adminCategoriesRouter,
  adminDishesRouter,
  adminOptionsRouter,
  adminValuesRouter,
} from './admin.catalog'
import { debugRouter } from './debug'

export const apiRouter = Router()

apiRouter.use('/health',     healthRouter)
apiRouter.use('/auth',       authRouter)
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/dishes',     dishesRouter)
apiRouter.use('/store',      storeRouter)
apiRouter.use('/i18n',       i18nRouter)
apiRouter.use('/otp',        otpRouter)
apiRouter.use('/menu',       menuRouter)
apiRouter.use('/cart',       cartRouter)
apiRouter.use('/addresses',  addressesRouter)
apiRouter.use('/orders',           ordersRouter)
apiRouter.use('/notifications',    notificationsRouter)
apiRouter.use('/admin/customers',  adminCustomersRouter)
apiRouter.use('/admin/staff',      adminStaffRouter)
apiRouter.use('/admin/categories', adminCategoriesRouter)
apiRouter.use('/admin/dishes',     adminDishesRouter)
apiRouter.use('/admin/options',    adminOptionsRouter)
apiRouter.use('/admin/values',     adminValuesRouter)
apiRouter.use('/admin/promotions', adminPromotionsRouter)
apiRouter.use('/admin/store',      adminSettingsRouter)
apiRouter.use('/admin/permissions', adminPermissionsRouter)
apiRouter.use('/admin/roles',       adminRolesRouter)
apiRouter.use('/admin/users',       adminUserRolesRouter)
apiRouter.use('/debug',            debugRouter)
