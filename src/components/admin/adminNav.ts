import {
  IconDashboard,
  IconOrders,
  IconMenu,
  IconTag,
  IconUsers,
  IconShield,
  IconSettings,
} from './AdminIcons'

export interface AdminNavLeaf {
  labelKey: string
  href: string
  badge?: number
}

export interface AdminNavItem {
  labelKey: string
  icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element
  href?: string
  children?: AdminNavLeaf[]
}

export interface AdminNavGroup {
  labelKey?: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    items: [
      { labelKey: 'admin.nav.dashboard', icon: IconDashboard, href: '/admin' },
    ],
  },
  {
    labelKey: 'admin.nav.operations',
    items: [
      { labelKey: 'admin.nav.orders', icon: IconOrders, href: '/admin/orders' },
    ],
  },
  {
    labelKey: 'admin.nav.catalog',
    items: [
      {
        labelKey: 'admin.nav.menu',
        icon: IconMenu,
        children: [
          { labelKey: 'admin.nav.categories', href: '/admin/menu/categories' },
          { labelKey: 'admin.nav.dishes',     href: '/admin/menu/dishes' },
          { labelKey: 'admin.nav.options',    href: '/admin/menu/options' },
        ],
      },
      { labelKey: 'admin.nav.promotions', icon: IconTag, href: '/admin/promotions' },
    ],
  },
  {
    labelKey: 'admin.nav.people',
    items: [
      {
        labelKey: 'admin.nav.people',
        icon: IconUsers,
        children: [
          { labelKey: 'admin.nav.customers', href: '/admin/customers' },
          { labelKey: 'admin.nav.staff',     href: '/admin/staff' },
        ],
      },
    ],
  },
  {
    labelKey: 'admin.nav.access_control',
    items: [
      {
        labelKey: 'admin.nav.access_control',
        icon: IconShield,
        children: [
          { labelKey: 'admin.nav.roles',       href: '/admin/roles' },
          { labelKey: 'admin.nav.permissions', href: '/admin/permissions' },
        ],
      },
    ],
  },
  {
    labelKey: 'admin.nav.config',
    items: [
      { labelKey: 'admin.nav.settings', icon: IconSettings, href: '/admin/settings' },
    ],
  },
  // TODO: thêm reports/audit vào group `admin.nav.config` khi các trang xong.
]
