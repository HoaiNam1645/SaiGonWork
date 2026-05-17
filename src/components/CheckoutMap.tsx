'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/delivery'

interface StoreOrigin {
  lat:     number
  lng:     number
  name?:   string | null
  address?: string | null
}

interface Props {
  /** Tọa độ store. Truyền vào → vẽ marker shop + cho phép fit bounds chung với
   *  destination (checkout). Bỏ qua → chỉ vẽ marker khách (vd setup địa chỉ cá nhân
   *  ở /account, không cần thấy shop). */
  origin?:       StoreOrigin
  destination:   LatLng | null
  routeGeometry: [number, number][] | null
  /** Khi set → marker khách kéo thả được, dragend fire callback. */
  onDestinationChange?: (pos: LatLng) => void
}

const RESTAURANT_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24s16-13 16-24c0-8.84-7.16-16-16-16z" fill="#c96442"/>
  <circle cx="16" cy="16" r="6" fill="#faf9f5"/>
</svg>`

const USER_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 32 40">
  <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24s16-13 16-24c0-8.84-7.16-16-16-16z" fill="#141413"/>
  <circle cx="16" cy="16" r="5" fill="#faf9f5"/>
</svg>`

function svgUrl(svg: string) {
  return `data:image/svg+xml;base64,${typeof window === 'undefined' ? '' : btoa(svg)}`
}

export default function CheckoutMap({ origin, destination, routeGeometry, onDestinationChange }: Props) {
  // Ref để callback mới nhất luôn được dùng trong dragend (closure stable)
  const onChangeRef = useRef(onDestinationChange)
  onChangeRef.current = onDestinationChange
  const draggable = !!onDestinationChange
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restaurantMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLineRef = useRef<any>(null)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return
      // Center: ưu tiên origin (checkout), fallback destination (address form chỉ có user)
      const center: [number, number] = origin
        ? [origin.lat, origin.lng]
        : destination
          ? [destination.lat, destination.lng]
          : [0, 0]
      const map = L.map(containerRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Chỉ vẽ marker shop khi caller truyền origin
      if (origin) {
        const restaurantIcon = L.icon({
          iconUrl: svgUrl(RESTAURANT_PIN_SVG),
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -36],
        })
        const restaurantMarker = L.marker([origin.lat, origin.lng], {
          icon: restaurantIcon,
        }).addTo(map)
        const popupLabel =
          `<strong>${origin.name ?? ''}</strong>` +
          (origin.address ? `<br/>${origin.address}` : '')
        if (popupLabel.trim() !== '<strong></strong>') {
          restaurantMarker.bindPopup(popupLabel)
        }
        restaurantMarkerRef.current = restaurantMarker
      }

      mapRef.current = map

      setTimeout(() => map.invalidateSize(), 100)
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // origin lat/lng intentionally NOT in deps: store coords là single source of truth
    // và không đổi giữa các phiên FE. Nếu admin sửa, refresh page là OK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update destination marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled) return
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current)
        userMarkerRef.current = null
      }
      if (destination) {
        const userIcon = L.icon({
          iconUrl: svgUrl(USER_PIN_SVG),
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        })
        const m = L.marker([destination.lat, destination.lng], {
          icon: userIcon,
          draggable,
          autoPan: true,
        }).addTo(map)
        if (draggable) {
          m.on('dragend', () => {
            const ll = m.getLatLng()
            onChangeRef.current?.({ lat: ll.lat, lng: ll.lng })
          })
        }
        userMarkerRef.current = m
      }
    })
    return () => {
      cancelled = true
    }
  }, [destination, draggable])

  // Update route polyline + fit bounds
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    import('leaflet').then((L) => {
      if (cancelled) return
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current)
        routeLineRef.current = null
      }
      if (routeGeometry && routeGeometry.length > 1) {
        const line = L.polyline(routeGeometry, {
          color: '#c96442',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
        routeLineRef.current = line
        map.fitBounds(line.getBounds(), { padding: [40, 40] })
      } else if (destination && origin) {
        // No route yet — fit chung 2 điểm shop + khách (checkout)
        map.fitBounds(
          L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]),
          { padding: [60, 60] },
        )
      } else if (destination) {
        // Address form: chỉ có user marker → center vào nó
        map.setView([destination.lat, destination.lng], 15)
      }
    })
    return () => {
      cancelled = true
    }
  }, [routeGeometry, destination, origin?.lat, origin?.lng])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden bg-[#e8e6dc]"
      style={{ minHeight: 280 }}
    />
  )
}
