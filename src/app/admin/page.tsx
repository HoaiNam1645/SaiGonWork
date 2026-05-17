'use client'

import Link from 'next/link'
import { useI18n } from '@/i18n/I18nContext'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminCard from '@/components/admin/AdminCard'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import StatusBadge, { type OrderStatus } from '@/components/admin/StatusBadge'
import {
  IconOrders,
  IconUsers,
  IconTag,
  IconChart,
  IconPlus,
  IconSettings,
} from '@/components/admin/AdminIcons'

const recentOrders: Array<{
  code: string
  customer: string
  amount: string
  status: OrderStatus
  time: string
}> = [
  { code: 'SGW-260512-0024', customer: 'Max Mustermann', amount: '€ 32,50', status: 'pending_payment', time: '2 min' },
  { code: 'SGW-260512-0023', customer: 'Anna Schulz',    amount: '€ 18,90', status: 'preparing',       time: '8 min' },
  { code: 'SGW-260512-0022', customer: 'Hoài Nam',       amount: '€ 45,80', status: 'delivering',     time: '15 min' },
  { code: 'SGW-260512-0021', customer: 'Lukas Weber',    amount: '€ 22,40', status: 'completed',       time: '32 min' },
  { code: 'SGW-260512-0020', customer: 'Julia Becker',   amount: '€ 14,50', status: 'cancelled',       time: '47 min' },
]

const topDishes = [
  { name: 'Phở bò',           orders: 18, revenue: '€ 214,20' },
  { name: 'Cơm tấm sườn',     orders: 14, revenue: '€ 180,60' },
  { name: 'Bún bò Huế',       orders: 11, revenue: '€ 137,50' },
  { name: 'Cà phê sữa đá',    orders: 9,  revenue: '€  40,50' },
]

const revenue7d = [820, 940, 1120, 870, 1330, 1480, 1247]

export default function AdminDashboardPage() {
  const { t } = useI18n()

  const max = Math.max(...revenue7d)
  const min = Math.min(...revenue7d)
  const points = revenue7d
    .map((v, i) => {
      const x = (i / (revenue7d.length - 1)) * 100
      const y = 100 - ((v - min) / (max - min || 1)) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.subtitle')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <AdminMetricCard
          label={t('admin.dashboard.metric.orders_today')}
          value="24"
          delta={{ value: '12%', positive: true }}
          hint={t('admin.dashboard.metric.vs_yesterday')}
          icon={IconOrders}
          accent="brand"
        />
        <AdminMetricCard
          label={t('admin.dashboard.metric.revenue_today')}
          value="€ 1.247"
          delta={{ value: '8%', positive: true }}
          hint={t('admin.dashboard.metric.vs_yesterday')}
          icon={IconChart}
          accent="success"
        />
        <AdminMetricCard
          label={t('admin.dashboard.metric.pending_payment')}
          value="3"
          delta={{ value: '1', positive: true }}
          hint={t('admin.dashboard.metric.vs_yesterday')}
          icon={IconTag}
          accent="warning"
        />
        <AdminMetricCard
          label={t('admin.dashboard.metric.new_customers')}
          value="18"
          delta={{ value: '24%', positive: true }}
          hint={t('admin.dashboard.metric.this_week')}
          icon={IconUsers}
          accent="gray"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mt-5">
        <div className="xl:col-span-2">
          <AdminCard title={t('admin.dashboard.revenue_chart')}>
            <div className="h-48 relative">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#465fff" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#465fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#rev-grad)" points={`0,100 ${points} 100,100`} />
                <polyline
                  fill="none"
                  stroke="#465fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  points={points}
                />
              </svg>
            </div>
            <div className="grid grid-cols-7 mt-3 text-[11px] text-gray-400 font-medium">
              {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
          </AdminCard>
        </div>

        <AdminCard title={t('admin.dashboard.quick_actions')}>
          <div className="space-y-2">
            <QuickAction href="/admin/menu/dishes" icon={IconPlus}     label={t('admin.dashboard.action.add_dish')} />
            <QuickAction href="/admin/promotions"  icon={IconTag}      label={t('admin.dashboard.action.new_promo')} />
            <QuickAction href="/admin/settings"    icon={IconSettings} label={t('admin.dashboard.action.toggle_store')} />
            <QuickAction href="/admin/orders"      icon={IconOrders}   label={t('admin.dashboard.action.view_orders')} />
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mt-5">
        <div className="xl:col-span-2">
          <AdminCard
            title={t('admin.dashboard.recent_orders')}
            action={
              <Link
                href="/admin/orders"
                className="text-[13px] font-semibold text-brand-500 hover:text-brand-600 transition"
              >
                {t('admin.dashboard.recent_orders.view_all')} →
              </Link>
            }
            noPad
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3">{t('admin.table.code')}</th>
                    <th className="text-left px-5 py-3">{t('admin.table.customer')}</th>
                    <th className="text-right px-5 py-3">{t('admin.table.amount')}</th>
                    <th className="text-left px-5 py-3">{t('admin.table.status')}</th>
                    <th className="text-right px-5 py-3">{t('admin.table.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.code} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-mono text-[12px] text-gray-900">{o.code}</td>
                      <td className="px-5 py-3 text-gray-700">{o.customer}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{o.amount}</td>
                      <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-5 py-3 text-right text-gray-500 text-[13px]">{o.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        <AdminCard title={t('admin.dashboard.top_dishes')}>
          <ul className="space-y-3.5">
            {topDishes.map((d, i) => (
              <li key={d.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 font-medium truncate">{d.name}</div>
                  <div className="text-[12px] text-gray-500">{d.orders} orders</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">{d.revenue}</div>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    </>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:border-brand-200 hover:bg-brand-25 transition"
    >
      <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-gray-300">→</span>
    </Link>
  )
}
