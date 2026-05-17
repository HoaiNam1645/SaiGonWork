interface AdminCardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPad?: boolean
}

export default function AdminCard({ title, action, children, className = '', noPad }: AdminCardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200
        shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]
        ${className}
      `}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {title && (
            <h2 className="text-base text-gray-900 font-semibold">
              {title}
            </h2>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
