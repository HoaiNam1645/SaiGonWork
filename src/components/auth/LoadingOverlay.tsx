'use client'

import { useEffect } from 'react'

interface LoadingOverlayProps {
  visible: boolean
  title?: string
  description?: string
}

export default function LoadingOverlay({ visible, title, description }: LoadingOverlayProps) {
  // Khoá scroll body khi overlay đang hiện
  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      {/* Backdrop — warm tint, blur */}
      <div
        aria-hidden
        className="absolute inset-0 bg-wood-dark/45 backdrop-blur-sm"
      />

      {/* Card */}
      <div
        style={{ animation: 'fadeInUp 180ms ease-out' }}
        className="
          relative w-full max-w-sm bg-[#FBF6E9] rounded-3xl px-8 py-9
          shadow-[0_0_0_1px_rgba(60,35,10,0.08),0_30px_60px_-20px_rgba(60,35,10,0.55)]
        "
      >
        {/* Spinner — concentric warm rings */}
        <div className="flex justify-center mb-6">
          <div className="relative w-14 h-14">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-amber/15"
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber border-r-amber animate-spin"
            />
          </div>
        </div>

        {title && (
          <h2 className="font-display text-[22px] leading-[1.2] text-wood-dark text-center font-medium">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-3 text-[14px] leading-[1.6] text-wood-dark/65 text-center">
            {description}
          </p>
        )}

        {/* Tiny progress hint — dots animate */}
        <div className="flex justify-center gap-1.5 mt-6" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-amber/60 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber/60 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber/60 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
