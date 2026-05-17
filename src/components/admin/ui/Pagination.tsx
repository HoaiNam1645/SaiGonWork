'use client'

import { useI18n } from '@/i18n/I18nContext'

interface Props {
  total:    number
  limit:    number
  offset:   number
  onChange: (offset: number) => void
}

/**
 * Pagination footer — port style từ free-nextjs-admin-dashboard/Pagination.tsx
 * với số trang ở giữa + Previous/Next ở 2 đầu.
 */
export default function Pagination({ total, limit, offset, onChange }: Props) {
  const { t } = useI18n()
  const pageCount   = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1
  const start       = total === 0 ? 0 : offset + 1
  const end         = Math.min(offset + limit, total)

  const pages = pagesAroundCurrent(currentPage, pageCount)

  function goPage(p: number) {
    onChange((p - 1) * limit)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 bg-white">
      <p className="text-xs text-gray-500">
        {t('admin.pagination.showing')
          .replace('{{start}}', String(start))
          .replace('{{end}}',   String(end))
          .replace('{{total}}', String(total))}
      </p>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => goPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="mr-2.5 inline-flex items-center justify-center h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('admin.pagination.prev')}
        </button>

        <div className="flex items-center gap-1.5">
          {currentPage > 3 && pageCount > 5 && <span className="px-1.5 text-gray-400">…</span>}
          {pages.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => goPage(p)}
              className={`flex w-9 h-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-700 hover:bg-brand-500/[0.08] hover:text-brand-500'
              }`}
            >
              {p}
            </button>
          ))}
          {currentPage < pageCount - 2 && pageCount > 5 && <span className="px-1.5 text-gray-400">…</span>}
        </div>

        <button
          type="button"
          onClick={() => goPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          className="ml-2.5 inline-flex items-center justify-center h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('admin.pagination.next')}
        </button>
      </div>
    </div>
  )
}

/**
 * Tính tập trang hiển thị quanh trang hiện tại.
 * Logic giống template: hiển thị tối đa 3-5 trang quanh current, kèm "…" 2 đầu.
 */
function pagesAroundCurrent(current: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  // Window 3 trang quanh current, clamp vào [1, totalPages]
  let start = current - 1
  let end   = current + 1
  if (start < 1)         { end += (1 - start); start = 1 }
  if (end > totalPages)  { start -= (end - totalPages); end = totalPages }
  if (start < 1) start = 1
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
