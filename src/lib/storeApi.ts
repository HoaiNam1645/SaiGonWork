'use client'

import { useEffect, useState } from 'react'
import { api } from './api'

// =====================================================================
// Types (khớp với GET /api/store)
// =====================================================================

export type ApiPaymentMethod = 'cash_on_delivery' | 'paypal' | 'bank_qr_image'

export interface StoreSettings {
  name:    string
  hotline: string | null
  email:   string | null
  address: string | null
  lat:     number | null
  lng:     number | null
  openHours:     unknown
  isOpen:        boolean
  closedMessage: string | null
  delivery: {
    radiusKm:           number | null
    baseFee:            number | null
    perKm:              number | null
    freeShipThreshold:  number | null
    kitchenPrepMinutes: number
  }
  payment: {
    methods:         ApiPaymentMethod[]
    paypalMeLink:    string | null
    bankQrImageUrl:  string | null
    bankAccountName: string | null
    bankAccountNo:   string | null
    bankName:        string | null
  }
  currency: string
}

// =====================================================================
// Cache + fetch
// =====================================================================

let cache:    StoreSettings | null         = null
let inflight: Promise<StoreSettings> | null = null

export function fetchStoreSettings(): Promise<StoreSettings> {
  if (cache)    return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = api<StoreSettings>('/store')
    .then(s => { cache = s; inflight = null; return s })
    .catch(err => { inflight = null; throw err })
  return inflight
}

export function invalidateStoreCache(): void {
  cache    = null
  inflight = null
}

// =====================================================================
// Hook
// =====================================================================

interface UseStoreResult {
  store:   StoreSettings | null
  loading: boolean
  error:   Error | null
}

export function useStoreSettings(): UseStoreResult {
  const [store,   setStore]   = useState<StoreSettings | null>(() => cache)
  const [loading, setLoading] = useState<boolean>(() => cache == null)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    if (cache) {
      setStore(cache)
      setLoading(false)
      return
    }
    let alive = true
    fetchStoreSettings()
      .then(s => {
        if (!alive) return
        setStore(s)
        setLoading(false)
      })
      .catch(e => {
        if (!alive) return
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
    return () => { alive = false }
  }, [])

  return { store, loading, error }
}
