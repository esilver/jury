'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

interface HeatmapPoint {
  latitude: number
  longitude: number
  value: number // -1 to 1
  density: number
}

interface JuryMapProps {
  centerLat: number
  centerLng: number
  radiusMiles: number
  points: HeatmapPoint[]
  userCount: number
}

// Component to handle map center updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])

  return null
}

// Convert miles to meters for Leaflet
function milesToMeters(miles: number): number {
  return miles * 1609.34
}

// Get color based on alignment value (-1 to 1)
function getAlignmentColor(value: number): string {
  if (value > 0.3) return '#22c55e' // Green - aligned
  if (value < -0.3) return '#ef4444' // Red - opposed
  return '#eab308' // Yellow - neutral
}

// Get opacity based on density
function getOpacity(density: number, maxDensity: number): number {
  const normalized = Math.min(density / Math.max(maxDensity, 1), 1)
  return 0.3 + normalized * 0.5
}

export default function JuryMap({
  centerLat,
  centerLng,
  radiusMiles,
  points,
  userCount,
}: JuryMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-jury-surface-light flex items-center justify-center">
        <div className="text-gray-400">Loading map...</div>
      </div>
    )
  }

  const center: [number, number] = [centerLat, centerLng]
  const radiusMeters = milesToMeters(radiusMiles)

  // Calculate zoom level based on radius
  const zoom = radiusMiles <= 5 ? 13 : radiusMiles <= 20 ? 11 : radiusMiles <= 50 ? 9 : 7

  // Find max density for opacity normalization
  const maxDensity = Math.max(...points.map((p) => p.density), 1)

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full rounded-2xl"
      style={{ background: '#1e293b' }}
      zoomControl={false}
    >
      <MapUpdater center={center} zoom={zoom} />

      {/* Dark theme map tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Radius circle */}
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '10, 10',
        }}
      />

      {/* User location marker */}
      <Marker position={center}>
        <Popup>
          <div className="text-center">
            <strong>Your Location</strong>
            <br />
            <span className="text-sm text-gray-600">
              {userCount} user{userCount !== 1 ? 's' : ''} in this area
            </span>
          </div>
        </Popup>
      </Marker>

      {/* Heatmap points as circles */}
      {points.map((point, index) => (
        <Circle
          key={index}
          center={[point.latitude, point.longitude]}
          radius={Math.max(200, point.density * 100)} // Size based on density
          pathOptions={{
            color: getAlignmentColor(point.value),
            fillColor: getAlignmentColor(point.value),
            fillOpacity: getOpacity(point.density, maxDensity),
            weight: 0,
          }}
        >
          <Popup>
            <div className="text-center">
              <strong>
                {point.value > 0.3
                  ? 'Aligned Area'
                  : point.value < -0.3
                  ? 'Opposing Area'
                  : 'Mixed Area'}
              </strong>
              <br />
              <span className="text-sm">
                {Math.round(Math.abs(point.value) * 100)}%{' '}
                {point.value > 0 ? 'alignment' : 'opposition'}
              </span>
              <br />
              <span className="text-xs text-gray-500">{point.density} votes</span>
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  )
}
