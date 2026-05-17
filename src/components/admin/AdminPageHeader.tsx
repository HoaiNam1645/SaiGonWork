interface AdminPageHeaderProps {
  eyebrow?: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-wider text-brand-500 font-semibold mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl sm:text-[28px] leading-tight text-gray-900 font-semibold">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
