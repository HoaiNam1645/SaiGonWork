'use client'

import { useI18n } from '@/i18n/I18nContext'
import type { TKey } from '@/i18n/dictionary'
import type { OrderStatus } from '@/types'

const STEPS: { key: Exclude<OrderStatus, 'cancelled'>; labelKey: TKey }[] = [
  { key: 'placed',    labelKey: 'stepper.placed' },
  { key: 'preparing', labelKey: 'stepper.preparing' },
  { key: 'shipping',  labelKey: 'stepper.shipping' },
  { key: 'delivered', labelKey: 'stepper.delivered' },
]

interface Props {
  status: OrderStatus
}

export default function OrderStatusStepper({ status }: Props) {
  const { t } = useI18n()

  if (status === 'cancelled') {
    return (
      <div className="rounded-xl border border-[#e8e6dc] bg-[#faf9f5] px-4 py-3.5 text-center">
        <div className="font-display text-[15px] font-medium text-[#141413] leading-tight">
          {t('stepper.cancelled.title')}
        </div>
        <div className="text-[13px] text-[#87867f] mt-0.5 leading-snug">
          {t('stepper.cancelled.body')}
        </div>
      </div>
    )
  }

  const activeIndex = STEPS.findIndex((s) => s.key === status)

  return (
    <div className="w-full">
      <div className="relative flex items-start justify-between">
        {/* connector — base line */}
        <div className="absolute top-2.5 left-2.5 right-2.5 h-px bg-[#e8e6dc]" />
        {/* connector — progress */}
        <div
          className="absolute top-2.5 left-2.5 h-px bg-[#c96442] transition-all duration-500"
          style={{
            width: `calc((100% - 1.25rem) * ${activeIndex / (STEPS.length - 1)})`,
          }}
        />

        {STEPS.map((step, idx) => {
          const state: 'done' | 'current' | 'upcoming' =
            idx < activeIndex ? 'done' : idx === activeIndex ? 'current' : 'upcoming'

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1">
              {state === 'current' ? (
                <div
                  className="w-5 h-5 rounded-full bg-[#c96442]"
                  style={{ boxShadow: '0 0 0 4px #faf9f5, 0 0 0 5px #c96442' }}
                />
              ) : state === 'done' ? (
                <div className="w-5 h-5 rounded-full bg-[#c96442] flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-[#faf9f5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full bg-[#faf9f5]"
                  style={{ boxShadow: '0 0 0 1px #e8e6dc' }}
                />
              )}
              <div
                className={`mt-2.5 text-[11px] sm:text-[12px] text-center max-w-[110px] leading-snug ${
                  state === 'current'
                    ? 'text-[#141413] font-medium'
                    : state === 'done'
                    ? 'text-[#5e5d59]'
                    : 'text-[#87867f]'
                }`}
                style={{ letterSpacing: '0.12px' }}
              >
                {t(step.labelKey)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
