'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

const isDigit = (c: string) => /^[0-9]$/.test(c)

function valueToSlots(value: string, length: number): string[] {
  return Array.from({ length }, (_, i) => {
    const ch = value[i]
    return ch && isDigit(ch) ? ch : ''
  })
}

function slotsToValue(slots: string[]): string {
  return slots.map(s => s || ' ').join('').replace(/\s+$/, '')
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const [, forceRender] = useState(0)
  // Slots là source of truth — luôn đọc/ghi qua ref để tránh stale closure khi gõ nhanh
  const slotsRef = useRef<string[]>(valueToSlots(value, length))
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  // Đẩy giá trị slots vào các input DOM (uncontrolled — set qua ref)
  const syncDOM = useCallback(() => {
    slotsRef.current.forEach((ch, i) => {
      const el = inputsRef.current[i]
      if (el && el.value !== ch) el.value = ch
    })
  }, [])

  // Sync khi parent thay đổi value (vd parent reset code = "" sau lỗi)
  useEffect(() => {
    const incoming = valueToSlots(value, length)
    const same = incoming.join('|') === slotsRef.current.join('|')
    if (!same) {
      slotsRef.current = incoming
      syncDOM()
      forceRender(n => n + 1) // để cập nhật visual ring/error state
    }
  }, [value, length, syncDOM])

  // Initial DOM set + autofocus
  useEffect(() => {
    syncDOM()
    if (autoFocus) inputsRef.current[0]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commit = useCallback(
    (next: string[]) => {
      slotsRef.current = next
      syncDOM()
      forceRender(n => n + 1)
      onChange(slotsToValue(next))
      if (next.every(isDigit)) onComplete?.(next.join(''))
    },
    [onChange, onComplete, syncDOM],
  )

  const focusInput = (idx: number) => {
    inputsRef.current[idx]?.focus()
  }

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const cur = slotsRef.current

    // Xoá
    if (!raw) {
      const next = [...cur]
      next[idx] = ''
      commit(next)
      return
    }

    // 1 ký tự — case thường gặp
    if (raw.length === 1) {
      const next = [...cur]
      next[idx] = raw
      commit(next)
      if (idx < length - 1) focusInput(idx + 1)
      return
    }

    // > 1 ký tự: ô có sẵn (browser nối cũ + mới) hoặc paste
    if (cur[idx]) {
      const existing = cur[idx]
      const newChar = raw.split('').find(c => c !== existing) ?? raw.at(-1)!
      const next = [...cur]
      next[idx] = newChar
      commit(next)
      if (idx < length - 1) focusInput(idx + 1)
      return
    }

    // Paste vào ô rỗng — spread
    const chars = raw.slice(0, length - idx).split('')
    const next = [...cur]
    chars.forEach((c, i) => { next[idx + i] = c })
    commit(next)
    const lastFilled = idx + chars.length - 1
    focusInput(Math.min(lastFilled + 1, length - 1))
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const cur = slotsRef.current
    if (e.key === 'Backspace') {
      const next = [...cur]
      if (next[idx]) {
        next[idx] = ''
        commit(next)
      } else if (idx > 0) {
        next[idx - 1] = ''
        commit(next)
        focusInput(idx - 1)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusInput(idx - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      focusInput(idx + 1)
      e.preventDefault()
    }
  }

  const handlePaste = (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length - idx)
    if (!text) return
    e.preventDefault()
    const cur = slotsRef.current
    const next = [...cur]
    text.split('').forEach((c, i) => { next[idx + i] = c })
    commit(next)
    const lastFilled = idx + text.length - 1
    focusInput(Math.min(lastFilled + 1, length - 1))
  }

  const slots = slotsRef.current

  return (
    <div
      className="flex justify-between gap-2 sm:gap-3"
      role="group"
      aria-label="OTP"
    >
      {Array.from({ length }).map((_, idx) => {
        const isActive = focusIdx === idx
        const ch = slots[idx] ?? ''
        return (
          <input
            key={idx}
            ref={el => { inputsRef.current[idx] = el }}
            type="text"
            inputMode="numeric"
            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            defaultValue=""
            disabled={disabled}
            onFocus={() => setFocusIdx(idx)}
            onBlur={() => setFocusIdx(null)}
            onClick={e => e.currentTarget.select()}
            onChange={e => handleChange(idx, e)}
            onKeyDown={e => handleKeyDown(idx, e)}
            onPaste={e => handlePaste(idx, e)}
            className={`
              w-full aspect-square min-w-0
              text-center font-display text-2xl sm:text-3xl text-wood-dark
              bg-white/90 rounded-xl
              transition
              shadow-[inset_0_0_0_1px_rgba(60,35,10,0.12)]
              focus:outline-none focus:bg-white
              ${
                error
                  ? '!shadow-[inset_0_0_0_1.5px_rgba(181,51,51,0.55),0_0_0_3px_rgba(181,51,51,0.12)]'
                  : isActive
                  ? 'shadow-[inset_0_0_0_1.5px_rgba(201,150,58,0.6),0_0_0_4px_rgba(201,150,58,0.18)]'
                  : ch
                  ? 'shadow-[inset_0_0_0_1px_rgba(201,150,58,0.45)]'
                  : ''
              }
              disabled:opacity-60
            `}
          />
        )
      })}
    </div>
  )
}
