'use client'

import { TableCell } from './Table'

export type SortDir = 'asc' | 'desc'

interface Props<K extends string> {
  /** Key đại diện cho column này (vd 'total', 'created') */
  sortKey:   K
  /** Sort key hiện tại đang active (null = không sort theo column nào) */
  activeKey: K | null
  /** Hướng sort hiện tại nếu activeKey === sortKey */
  activeDir: SortDir | null
  /** Click header → toggle (asc → desc → asc) trên cùng key, hoặc switch key */
  onSort:    (key: K, dir: SortDir) => void
  align?:    'left' | 'right'
  children:  React.ReactNode
}

/**
 * Sortable column header — hiển thị mũi tên up/down theo state.
 * Click toggle giữa asc/desc; chuyển column khác → mặc định desc cho timestamp/numeric.
 */
export default function SortableHeader<K extends string>({
  sortKey, activeKey, activeDir, onSort, align = 'left', children,
}: Props<K>) {
  const isActive = activeKey === sortKey
  const dir      = isActive ? activeDir : null

  function handleClick() {
    if (!isActive) {
      // Switch sang column này → default desc (mới nhất / cao nhất trước)
      onSort(sortKey, 'desc')
    } else {
      onSort(sortKey, activeDir === 'desc' ? 'asc' : 'desc')
    }
  }

  return (
    <TableCell
      isHeader
      className={`px-5 py-3 font-medium text-gray-500 text-[12px] ${
        align === 'right' ? 'text-right' : 'text-start'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-gray-800 transition-colors ${
          isActive ? 'text-gray-800' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {children}
        <svg
          className={`w-3 h-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden
        >
          {dir === 'asc' ? (
            <path d="M6 3l4 5H2z" />
          ) : (
            <path d="M6 9l4-5H2z" />
          )}
        </svg>
      </button>
    </TableCell>
  )
}
