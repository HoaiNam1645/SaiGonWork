'use client'

import { forwardRef, useId } from 'react'

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  hint?: string
  error?: string | null
  trailing?: React.ReactNode
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { label, hint, error, trailing, id, className = '', ...rest },
  ref,
) {
  const reactId = useId()
  const inputId = id ?? `auth-input-${reactId}`
  const hasError = Boolean(error)

  return (
    <div className="flex flex-col">
      <label
        htmlFor={inputId}
        className="text-[13px] font-medium text-wood-dark/85 mb-1.5"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={`
            w-full h-11 px-4 ${trailing ? 'pr-11' : ''}
            rounded-xl bg-white/90 text-wood-dark placeholder:text-wood-dark/35
            text-[15px] leading-none
            transition
            shadow-[inset_0_0_0_1px_rgba(60,35,10,0.12)]
            focus:outline-none focus:bg-white
            focus:shadow-[inset_0_0_0_1px_rgba(201,150,58,0.55),0_0_0_4px_rgba(201,150,58,0.18)]
            disabled:opacity-60 disabled:cursor-not-allowed
            ${hasError ? '!shadow-[inset_0_0_0_1.5px_rgba(181,51,51,0.55),0_0_0_3px_rgba(181,51,51,0.12)]' : ''}
            ${className}
          `}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-3 flex items-center text-wood-dark/45">
            {trailing}
          </div>
        )}
      </div>

      {hasError ? (
        <p className="mt-1.5 text-[12.5px] text-[#b53333]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-wood-dark/55">{hint}</p>
      ) : null}
    </div>
  )
})

export default AuthInput
