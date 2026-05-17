'use client'

import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export default function AuthButton({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: AuthButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        relative w-full h-12 rounded-xl font-semibold text-[15px]
        transition focus:outline-none
        disabled:opacity-60 disabled:cursor-not-allowed
        ${
          isPrimary
            ? `
              bg-amber text-parchment
              shadow-[0_0_0_1px_rgba(232,101,10,0.45),0_8px_24px_-10px_rgba(232,101,10,0.55)]
              hover:bg-[#d65a08]
              focus:shadow-[0_0_0_1px_rgba(232,101,10,0.55),0_0_0_4px_rgba(232,101,10,0.22),0_8px_24px_-10px_rgba(232,101,10,0.55)]
            `
            : `
              bg-transparent text-wood-dark
              shadow-[inset_0_0_0_1px_rgba(60,35,10,0.18)]
              hover:bg-wood-dark/[0.04]
              focus:shadow-[inset_0_0_0_1px_rgba(60,35,10,0.4),0_0_0_3px_rgba(60,35,10,0.08)]
            `
        }
        ${className}
      `}
    >
      <span
        className={`flex items-center justify-center gap-2 transition ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </span>

      {loading && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span
            className={`w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin`}
          />
        </span>
      )}
    </button>
  )
}
