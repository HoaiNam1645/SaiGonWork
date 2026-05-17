import type { SVGProps } from 'react'

interface AdminMetricCardProps {
  label: string
  value: string
  delta?: { value: string; positive?: boolean }
  hint?: string
  icon?: (props: SVGProps<SVGSVGElement>) => React.JSX.Element
  accent?: 'brand' | 'success' | 'warning' | 'error' | 'gray'
}

const accentMap = {
  brand:   { bg: 'bg-brand-50',   fg: 'text-brand-500' },
  success: { bg: 'bg-success-50', fg: 'text-success-600' },
  warning: { bg: 'bg-warning-50', fg: 'text-warning-600' },
  error:   { bg: 'bg-error-50',   fg: 'text-error-600' },
  gray:    { bg: 'bg-gray-100',   fg: 'text-gray-600' },
} as const

export default function AdminMetricCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  accent = 'brand',
}: AdminMetricCardProps) {
  const a = accentMap[accent]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500 font-medium">{label}</div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.bg} ${a.fg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4 text-[28px] leading-none text-gray-900 font-semibold">
        {value}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-[13px]">
          {delta && (
            <span
              className={
                delta.positive
                  ? 'inline-flex items-center gap-0.5 text-success-600 font-semibold bg-success-50 px-2 py-0.5 rounded-full'
                  : 'inline-flex items-center gap-0.5 text-error-600 font-semibold bg-error-50 px-2 py-0.5 rounded-full'
              }
            >
              {delta.positive ? '↑' : '↓'} {delta.value}
            </span>
          )}
          {hint && <span className="text-gray-500">{hint}</span>}
        </div>
      )}
    </div>
  )
}
