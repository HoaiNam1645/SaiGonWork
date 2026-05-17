import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'

type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'delivering'
  | 'completed'
  | 'cancelled'

const styles: Record<OrderStatus, string> = {
  pending_payment: 'bg-warning-50 text-warning-700',
  paid:            'bg-brand-50   text-brand-700',
  preparing:       'bg-orange-50  text-orange-600',
  delivering:      'bg-brand-50   text-brand-600',
  completed:       'bg-success-50 text-success-700',
  cancelled:       'bg-error-50   text-error-700',
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n()
  const key = `admin.status.${status}` as TKey
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}>
      {t(key)}
    </span>
  )
}

export type { OrderStatus }
