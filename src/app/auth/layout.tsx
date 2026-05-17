import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anmelden · Sai Gon Wok',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="
        relative min-h-screen flex flex-col items-center justify-center px-4 py-12
        bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,#FBF1D2_0%,#F0DAA5_55%,#DCB87C_100%)]
      "
    >
      {/* Soft bamboo decorations (matching home page rhythm) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[240px] opacity-[0.18]
                   bg-[url('/decorations/bamboo-left.svg')] bg-no-repeat bg-[length:240px_auto] bg-left-top
                   hidden md:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[240px] opacity-[0.18]
                   bg-[url('/decorations/bamboo-right.svg')] bg-no-repeat bg-[length:240px_auto] bg-right-top
                   hidden md:block"
      />

      {children}
    </main>
  )
}
