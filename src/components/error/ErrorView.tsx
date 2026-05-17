'use client'

import Link from 'next/link'

interface ErrorViewProps {
  /** Mã trạng thái lớn hiển thị mờ (vd "401"). */
  code?: string | number
  /** Eyebrow ngắn uppercase (vd "Anmeldung erforderlich"). */
  eyebrow?: string
  /** Title chính (serif lớn). */
  title: string
  /** Body description. */
  description?: string
  /** Primary CTA — { label, href } or { label, onClick }. */
  primary?: { label: string; href?: string; onClick?: () => void }
  /** Secondary link (ghost). */
  secondary?: { label: string; href: string }
}

export default function ErrorView({
  code,
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: ErrorViewProps) {
  return (
    <main
      className="
        relative min-h-screen flex flex-col items-center justify-center px-4 py-12
        bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#FBF1D2_0%,#F0DAA5_55%,#DCB87C_100%)]
      "
    >
      <div className="w-full max-w-md relative">
        <div
          className="
            relative bg-[#FBF6E9] rounded-3xl px-8 sm:px-10 py-10 text-center
            shadow-[0_0_0_1px_rgba(60,35,10,0.08),0_28px_60px_-30px_rgba(60,35,10,0.45),0_8px_24px_-12px_rgba(60,35,10,0.18)]
          "
        >
          {code != null && (
            <div
              aria-hidden
              className="font-display text-[88px] leading-none text-wood-dark/10 font-medium select-none mb-2"
            >
              {code}
            </div>
          )}

          {eyebrow && (
            <span className="inline-block text-[11px] uppercase tracking-[0.18em] text-amber font-semibold mb-3">
              {eyebrow}
            </span>
          )}

          <h1 className="font-display text-[28px] sm:text-[32px] leading-[1.15] text-wood-dark font-medium">
            {title}
          </h1>

          {description && (
            <p className="mt-3 text-[15px] leading-[1.6] text-wood-dark/65">
              {description}
            </p>
          )}

          {primary && (
            <div className="mt-7">
              {primary.href ? (
                <Link
                  href={primary.href}
                  className="
                    inline-flex items-center justify-center w-full h-12 rounded-xl
                    bg-amber text-parchment font-semibold text-[15px]
                    shadow-[0_0_0_1px_rgba(232,101,10,0.45),0_8px_24px_-10px_rgba(232,101,10,0.55)]
                    hover:bg-[#d65a08] transition
                  "
                >
                  {primary.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={primary.onClick}
                  className="
                    inline-flex items-center justify-center w-full h-12 rounded-xl
                    bg-amber text-parchment font-semibold text-[15px]
                    shadow-[0_0_0_1px_rgba(232,101,10,0.45),0_8px_24px_-10px_rgba(232,101,10,0.55)]
                    hover:bg-[#d65a08] transition
                  "
                >
                  {primary.label}
                </button>
              )}
            </div>
          )}
        </div>

        {secondary && (
          <div className="mt-6 text-center">
            <Link
              href={secondary.href}
              className="text-[14px] text-wood-dark/65 hover:text-wood-dark transition"
            >
              ← {secondary.label}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
