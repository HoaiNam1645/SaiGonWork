'use client'

import Link from 'next/link'
import Image from 'next/image'
import { notFound, useParams } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import OrderStatusStepper from '@/components/OrderStatusStepper'
import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import { getOrderById } from '@/data/orders'
import type { OrderStatus } from '@/types'

const STATUS_KEY: Record<OrderStatus, TKey> = {
  placed:    'status.placed',
  preparing: 'status.preparing',
  shipping:  'status.shipping',
  delivered: 'status.delivered',
  cancelled: 'status.cancelled',
}

const formatPrice = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const { t, formatDate } = useI18n()

  const order = getOrderById(params.id)
  if (!order) notFound()

  const dotColor =
    order.status === 'cancelled'
      ? '#b53333'
      : order.status === 'delivered'
      ? '#5e5d59'
      : '#c96442'

  return (
    <>
      <Header />
      <main className="menu-page-bg min-h-screen pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#5e5d59] hover:text-[#141413] mb-6 transition-colors"
          >
            ← {t('order.back')}
          </Link>

          {/* Combined header + stepper */}
          <div
            className="rounded-2xl bg-[#faf9f5] mb-4 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px #f0eee6' }}
          >
            <div className="px-6 pt-5 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span
                      className="text-[10px] uppercase text-[#87867f] font-medium"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {t('order.code_label')}
                    </span>
                    <span className="font-display text-[#141413] text-[20px] sm:text-[22px] font-medium">
                      #{order.code}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#87867f] mt-1">
                    {t('order.placed_at')} · {formatDate(order.createdAt)}
                  </div>
                </div>
                <span className="text-[13px] text-[#5e5d59] flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  {t(STATUS_KEY[order.status])}
                </span>
              </div>
            </div>
            <div className="px-6 py-5" style={{ borderTop: '1px solid #f0eee6' }}>
              <OrderStatusStepper status={order.status} />
              {order.status === 'cancelled' && order.cancelReason && (
                <div className="mt-4 text-[13px] text-[#5e5d59] text-center">
                  <span className="text-[#141413] font-medium">{t('order.cancel_reason')} </span>
                  {order.cancelReason}
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div
            className="rounded-2xl bg-[#faf9f5] p-6 mb-4"
            style={{ boxShadow: '0 0 0 1px #f0eee6' }}
          >
            <h2 className="font-display text-[#141413] text-[20px] font-medium mb-5" style={{ lineHeight: 1.2 }}>
              {t('order.items_title')}
            </h2>
            <div>
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  style={idx > 0 ? { borderTop: '1px solid #f0eee6' } : undefined}
                >
                  {item.image && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#e8e6dc] flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[#141413] text-[16px] font-medium leading-tight">
                      {item.name}
                      {item.variantLabel && (
                        <span className="ml-2 text-[12px] font-normal text-[#87867f]">
                          {item.variantLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#87867f] mt-1">
                      {formatPrice(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-display text-[#141413] text-[16px] font-medium whitespace-nowrap">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-5 pt-5 space-y-2 text-[14px]"
              style={{ borderTop: '1px solid #f0eee6' }}
            >
              <div className="flex justify-between text-[#5e5d59]">
                <span>{t('order.subtotal')}</span>
                <span className="text-[#141413]">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5e5d59]">
                <span>{t('order.shipping_fee')}</span>
                <span className="text-[#141413]">{formatPrice(order.shippingFee)}</span>
              </div>
              <div
                className="flex items-baseline justify-between pt-3 mt-3"
                style={{ borderTop: '1px solid #f0eee6' }}
              >
                <span className="font-display text-[#141413] text-[16px] font-medium">
                  {t('order.total')}
                </span>
                <span className="font-display text-[#141413] text-[22px] font-medium">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer + payment */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div
              className="rounded-2xl bg-[#faf9f5] p-6"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
              <h2 className="font-display text-[#141413] text-[16px] font-medium mb-4" style={{ lineHeight: 1.2 }}>
                {t('order.shipping_info')}
              </h2>
              <dl className="space-y-3.5 text-[14px]">
                <div>
                  <dt
                    className="text-[10px] uppercase text-[#87867f] font-medium"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {t('order.recipient')}
                  </dt>
                  <dd className="text-[#141413] mt-0.5">{order.customer.name}</dd>
                </div>
                <div>
                  <dt
                    className="text-[10px] uppercase text-[#87867f] font-medium"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {t('order.phone')}
                  </dt>
                  <dd className="text-[#141413] mt-0.5">{order.customer.phone}</dd>
                </div>
                <div>
                  <dt
                    className="text-[10px] uppercase text-[#87867f] font-medium"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {t('order.address')}
                  </dt>
                  <dd className="text-[#141413] mt-0.5" style={{ lineHeight: 1.5 }}>
                    {order.customer.address}
                  </dd>
                </div>
                {order.note && (
                  <div>
                    <dt
                      className="text-[10px] uppercase text-[#87867f] font-medium"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {t('order.note')}
                    </dt>
                    <dd className="text-[#5e5d59] italic mt-0.5">{order.note}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div
              className="rounded-2xl bg-[#faf9f5] p-6 flex flex-col"
              style={{ boxShadow: '0 0 0 1px #f0eee6' }}
            >
              <h2 className="font-display text-[#141413] text-[16px] font-medium mb-4" style={{ lineHeight: 1.2 }}>
                {t('order.payment')}
              </h2>
              <div className="text-[14px]">
                <div
                  className="text-[10px] uppercase text-[#87867f] font-medium"
                  style={{ letterSpacing: '0.5px' }}
                >
                  {t('order.payment_method')}
                </div>
                <div className="text-[#141413] mt-0.5">{order.paymentMethod}</div>
              </div>

              {order.status === 'delivered' && (
                <button className="mt-auto pt-5 text-left" type="button">
                  <span
                    className="block w-full text-center bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
                    style={{ boxShadow: '0 0 0 1px #c96442' }}
                  >
                    {t('order.reorder')}
                  </span>
                </button>
              )}
              {(order.status === 'placed' || order.status === 'preparing') && (
                <button className="mt-auto pt-5 text-left" type="button">
                  <span
                    className="block w-full text-center bg-[#e8e6dc] hover:bg-[#f0eee6] text-[#4d4c48] font-medium text-[14px] py-2.5 rounded-xl transition-colors"
                    style={{ boxShadow: '0 0 0 1px #d1cfc5' }}
                  >
                    {t('order.cancel')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
