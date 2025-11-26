'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useLocation } from '@/contexts/LocationContext'
import { Loader2, MapPin, Users, ZoomIn, ZoomOut, Save } from 'lucide-react'

interface HeatmapData {
  points: {
    latitude: number
    longitude: number
    value: number
    density: number
  }[]
  stats: {
    totalVotes: number
    avgAlignment: number
    userCount: number
  }
}

export default function MapPage() {
  const { latitude, longitude, granted, requestLocation, loading: locationLoading } = useLocation()
  const [radiusMiles, setRadiusMiles] = useState(20)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [radiusName, setRadiusName] = useState('')

  // Fetch heatmap data
  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', latitude, longitude, radiusMiles],
    queryFn: async () => {
      if (!latitude || !longitude) return null
      const res = await fetch(
        `/api/heatmap?lat=${latitude}&lng=${longitude}&radius=${radiusMiles}`
      )
      if (!res.ok) throw new Error('Failed to fetch heatmap')
      return res.json() as Promise<HeatmapData>
    },
    enabled: !!latitude && !!longitude,
  })

  const handleSaveRadius = async () => {
    if (!radiusName.trim() || !latitude || !longitude) return

    try {
      await fetch('/api/saved-radii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: radiusName,
          latitude,
          longitude,
          radiusMiles,
        }),
      })
      setShowSaveDialog(false)
      setRadiusName('')
    } catch (error) {
      console.error('Failed to save radius:', error)
    }
  }

  if (!granted) {
    return (
      <div className="min-h-screen">
        <Header title="Good Company Map" showLogo={false} />
        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="card-base p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-jury-primary/20 flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-jury-primary" />
            </div>
            <h2 className="text-xl font-semibold">Location Required</h2>
            <p className="text-gray-400">
              Enable location to see the Good Company Map and discover alignment in your area.
            </p>
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="btn-primary"
            >
              {locationLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enable Location'
              )}
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="Good Company Map" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Radius Controls */}
        <div className="card-base p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Search Radius</span>
            <span className="text-sm text-gray-400">{radiusMiles} miles</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRadiusMiles(Math.max(1, radiusMiles - 5))}
              className="p-2 rounded-lg bg-jury-surface-light hover:bg-gray-600 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="100"
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="flex-1 h-2 bg-jury-surface-light rounded-lg appearance-none cursor-pointer"
            />
            <button
              onClick={() => setRadiusMiles(Math.min(100, radiusMiles + 5))}
              className="p-2 rounded-lg bg-jury-surface-light hover:bg-gray-600 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-2 rounded-lg bg-jury-primary hover:bg-blue-600 transition-colors"
              title="Save this radius"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Map Visualization */}
        <div className="card-base overflow-hidden" style={{ height: '400px' }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
            </div>
          ) : (
            <SimpleHeatmapView
              centerLat={latitude!}
              centerLng={longitude!}
              radiusMiles={radiusMiles}
              data={data}
            />
          )}
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-bold text-jury-primary">
                {data.stats.userCount}
              </div>
              <div className="text-xs text-gray-400">People Nearby</div>
            </div>
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-bold text-jury-approve">
                {Math.round(data.stats.avgAlignment * 100)}%
              </div>
              <div className="text-xs text-gray-400">Avg Alignment</div>
            </div>
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-bold">{data.stats.totalVotes}</div>
              <div className="text-xs text-gray-400">Total Votes</div>
            </div>
          </div>
        )}

        {/* Low Data Warning */}
        {data && data.stats.userCount < 5 && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm">
            <p>
              <strong>Low data:</strong> Only {data.stats.userCount} user
              {data.stats.userCount !== 1 ? 's' : ''} found in this area. Results may not be representative.
            </p>
          </div>
        )}

        {/* Alignment Legend */}
        <div className="card-base p-4">
          <p className="text-sm font-medium mb-2">Alignment Scale</p>
          <div className="h-4 rounded-full overflow-hidden heatmap-gradient" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Opposing</span>
            <span>Neutral</span>
            <span>Aligned</span>
          </div>
        </div>
      </main>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-base p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">Save This Radius</h3>
            <input
              type="text"
              value={radiusName}
              onChange={(e) => setRadiusName(e.target.value)}
              placeholder="e.g., Home, Work, Downtown"
              className="input-field"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRadius}
                disabled={!radiusName.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Simple CSS-based heatmap visualization (placeholder for a real map library)
function SimpleHeatmapView({
  centerLat,
  centerLng,
  radiusMiles,
  data,
}: {
  centerLat: number
  centerLng: number
  radiusMiles: number
  data: HeatmapData | null | undefined
}) {
  const points = data?.points || []

  return (
    <div className="relative w-full h-full bg-jury-surface-light">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center marker (user location) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-4 h-4 rounded-full bg-jury-primary border-2 border-white shadow-lg" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-jury-primary/50 animate-ping" />
      </div>

      {/* Radius circle */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-jury-primary/30"
        style={{
          width: `${Math.min(90, radiusMiles * 3)}%`,
          height: `${Math.min(90, radiusMiles * 3)}%`,
        }}
      />

      {/* Heatmap points */}
      {points.map((point, index) => {
        // Convert lat/lng offset to position
        const latDiff = point.latitude - centerLat
        const lngDiff = point.longitude - centerLng
        const x = 50 + lngDiff * 500 // Scale factor
        const y = 50 - latDiff * 500 // Y is inverted

        // Color based on value (-1 to 1)
        const color =
          point.value > 0
            ? `rgba(34, 197, 94, ${0.3 + Math.abs(point.value) * 0.7})`
            : `rgba(239, 68, 68, ${0.3 + Math.abs(point.value) * 0.7})`

        // Size based on density
        const size = 10 + point.density * 5

        return (
          <div
            key={index}
            className="absolute rounded-full blur-sm"
            style={{
              left: `${Math.max(5, Math.min(95, x))}%`,
              top: `${Math.max(5, Math.min(95, y))}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}

      {/* No data placeholder */}
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No vote data in this area yet</p>
          </div>
        </div>
      )}
    </div>
  )
}
