'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nContext'
import { api, ApiError } from '@/lib/api'

export interface SavedAddress {
  id:         string
  recipient:  string
  phone:      string
  line:       string
  ward:       string | null
  district:   string | null
  city:       string
  country:    string
  postalCode: string | null
  lat:        number | null
  lng:        number | null
  note:       string | null
  isDefault:  boolean
}

interface Props {
  selectedId: string | null
  onSelect:   (a: SavedAddress) => void
  /** Tự pick default ngay sau khi list load nếu chưa có selectedId. Mặc định: true. */
  autoPickDefault?: boolean
}

export default function SavedAddressPicker({
  selectedId, onSelect, autoPickDefault = true,
}: Props) {
  const { t } = useI18n()
  const [list,    setList]    = useState<SavedAddress[] | null>(null)
  const [loading, setLoading] = useState(true)

  // Giữ callback ổn định để effect auto-pick không lặp khi parent re-render
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{ addresses: SavedAddress[] }>('/addresses')
        // Lọc address placeholder (line trống — sinh tự động khi đăng ký)
        setList(res.addresses.filter(a => a.line.trim().length > 0))
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setList([])
        else { setList([]); console.warn('[saved-addresses]', e) }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Auto pick default sau khi list load. Chỉ fire 1 lần (khi selectedId vẫn null).
  useEffect(() => {
    if (!autoPickDefault) return
    if (loading || !list || list.length === 0 || selectedId) return
    const def = list.find(a => a.isDefault) ?? list[0]
    onSelectRef.current(def)
  }, [autoPickDefault, loading, list, selectedId])

  // Loading
  if (loading) {
    return (
      <div className="text-[13px] text-[#87867f] py-3">…</div>
    )
  }

  // Empty: customer login nhưng chưa có address → CTA add tại /account
  if (!list || list.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-4 text-center"
        style={{ backgroundColor: '#fff', boxShadow: '0 0 0 1px #e8e6dc' }}
      >
        <div className="font-display text-[#141413] text-[15px] font-medium mb-1">
          {t('checkout.saved_addresses.empty_title')}
        </div>
        <p className="text-[13px] text-[#5e5d59] mb-3" style={{ lineHeight: 1.5 }}>
          {t('checkout.saved_addresses.empty_body')}
        </p>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 bg-[#c96442] hover:bg-[#d97757] text-[#faf9f5] font-medium text-[13px] px-4 py-2 rounded-xl transition-colors"
        >
          {t('checkout.saved_addresses.empty_cta')} →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {list.map(a => {
          const isSelected = selectedId === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a)}
              className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
                isSelected ? 'bg-[#e8e6dc]' : 'bg-white hover:bg-[#f0eee6]'
              }`}
              style={{
                boxShadow: isSelected ? '0 0 0 2px #c96442' : '0 0 0 1px #e8e6dc',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 ${
                    isSelected ? 'border-[#c96442] bg-[#c96442]' : 'border-[#87867f] bg-transparent'
                  }`}
                  style={{ boxShadow: isSelected ? 'inset 0 0 0 3px #faf9f5' : 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-[#141413] text-[14px]">{a.recipient}</span>
                    {a.isDefault && (
                      <span className="text-[10px] uppercase tracking-wide bg-[#c96442] text-[#faf9f5] px-1.5 py-0.5 rounded">
                        {t('checkout.saved_addresses.default_tag')}
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[11px] text-[#c96442] font-medium">
                        · {t('checkout.saved_addresses.using')}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#5e5d59] mt-0.5">{a.phone}</div>
                  <div className="text-[13px] text-[#5e5d59] mt-0.5" style={{ lineHeight: 1.4 }}>
                    {a.line}
                    {a.postalCode || a.city ? `, ${[a.postalCode, a.city].filter(Boolean).join(' ')}` : ''}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link
          href="/account"
          className="text-[12px] text-[#c96442] hover:text-[#d97757] transition-colors"
        >
          {t('checkout.saved_addresses.manage')} →
        </Link>
      </div>
    </div>
  )
}
