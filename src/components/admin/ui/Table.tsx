/**
 * Table primitives cho admin dashboard — port từ
 * free-nextjs-admin-dashboard/src/components/ui/table/index.tsx.
 *
 * Dùng kèm component card wrapper bên ngoài:
 *   <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
 *     <div className="max-w-full overflow-x-auto">
 *       <Table>...</Table>
 *     </div>
 *   </div>
 */
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

interface TableProps {
  children:  ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return <table className={`min-w-full ${className}`}>{children}</table>
}

export function TableHeader({ children, className = '' }: TableProps) {
  return <thead className={className}>{children}</thead>
}

export function TableBody({ children, className = '' }: TableProps) {
  return <tbody className={className}>{children}</tbody>
}

interface TableRowProps {
  children:   ReactNode
  className?: string
  style?:     React.CSSProperties
}

export function TableRow({ children, className = '', style }: TableRowProps) {
  return <tr className={className} style={style}>{children}</tr>
}

interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'className'>, Omit<ThHTMLAttributes<HTMLTableCellElement>, 'className'> {
  children:    ReactNode
  isHeader?:   boolean
  className?:  string
}

export function TableCell({ children, isHeader = false, className = '', ...rest }: TableCellProps) {
  const Tag = isHeader ? 'th' : 'td'
  return <Tag className={className} {...rest}>{children}</Tag>
}
