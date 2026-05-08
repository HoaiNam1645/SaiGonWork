'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '@/lib/delivery'
import { RESTAURANT } from '@/lib/delivery'

interface Props {
  destination: LatLng | null
  routeGeometry: [number, number][] | null
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

export default function CheckoutMap({ destination, routeGeometry }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Use any for leaflet refs to avoid bringing the type into module scope
  // (leaflet only loads on the client and we lazy-import it).
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
      const map = L.map(containerRef.current, {
        center: [RESTAURANT.lat, RESTAURANT.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      const restaurantIcon = L.icon({
        iconUrl: svgUrl(RESTAURANT_PIN_SVG),
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -36],
      })
      const restaurantMarker = L.marker([RESTAURANT.lat, RESTAURANT.lng], {
        icon: restaurantIcon,
      }).addTo(map)
      restaurantMarker.bindPopup(`<strong>${RESTAURANT.name}</strong><br/>${RESTAURANT.address}`)

      mapRef.current = map
      restaurantMarkerRef.current = restaurantMarker

      // force a resize after mount in case container was hidden
      setTimeout(() => map.invalidateSize(), 100)
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
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
        const m = L.marker([destination.lat, destination.lng], { icon: userIcon }).addTo(map)
        userMarkerRef.current = m
      }
    })
    return () => {
      cancelled = true
    }
  }, [destination])

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
      } else if (destination) {
        // No route yet but we have a destination — fit between two points
        map.fitBounds(
          L.latLngBounds(
            [RESTAURANT.lat, RESTAURANT.lng],
            [destination.lat, destination.lng],
          ),
          { padding: [60, 60] },
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [routeGeometry, destination])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden bg-[#e8e6dc]"
      style={{ minHeight: 280 }}
    />
  )
}
