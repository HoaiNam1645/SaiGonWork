'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import UnauthorizedView from '@/components/error/UnauthorizedView'

function Inner() {
  const params = useSearchParams()
  const next = params.get('next') ?? undefined
  return <UnauthorizedView next={next} />
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
