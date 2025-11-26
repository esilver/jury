'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { useLocation } from '@/contexts/LocationContext'
import { Loader2, MapPin, ZoomIn, ZoomOut, Save, X, Users, TrendingUp, BarChart3, Navigation, Globe } from 'lucide-react'

const JuryMap = dynamic(() => import('@/components/map/JuryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-jury-surface-light rounded-2xl">
      <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
      <p className="mt-3 text-gray-400 text-sm">Loading map...</p>
    </div>
  ),
})

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

const DEFAULT_LAT = 40.7128
const DEFAULT_LNG = -74.006

export default function MapPage() {
  const { latitude, longitude, granted, requestLocation, loading: locationLoading } = useLocation()
  const [radiusMiles, setRadiusMiles] = useState(20)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [radiusName, setRadiusName] = useState('')
  const [useDefaultLocation, setUseDefaultLocation] = useState(false)

  const mapLat = granted && latitude ? latitude : useDefaultLocation ? DEFAULT_LAT : null
  const mapLng = granted && longitude ? longitude : useDefaultLocation ? DEFAULT_LNG : null
  const showMap = mapLat !== null && mapLng !== null

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', mapLat, mapLng, radiusMiles],
    queryFn: async () => {
      if (!mapLat || !mapLng) return null
      const res = await fetch(
        `/api/heatmap?lat=${mapLat}&lng=${mapLng}&radius=${radiusMiles}`
      )
      if (!res.ok) throw new Error('Failed to fetch heatmap')
      return res.json() as Promise<HeatmapData>
    },
    enabled: showMap,
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

  if (!showMap) {
    return (
      <div className="min-h-screen pb-24">
        <Header title="Good Company Map" showLogo={false} />
        <main className="max-w-lg mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-jury-primary/20 to-jury-secondary/20 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-jury-primary animate-float" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Enable Location</h2>
            <p className="text-gray-400 mb-8 max-w-xs mx-auto">
              See alignment heatmaps and discover like-minded people in your area.
            </p>
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            >
              {locationLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Enable Location
                </>
              )}
            </button>
            <div className="divider my-6" />
            <button
              onClick={() => setUseDefaultLocation(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Globe className="w-5 h-5" />
              Use Demo Location (NYC)
            </button>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <Header title="Good Company Map" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Radius Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-300">Search Radius</span>
            <span className="text-lg font-bold text-jury-primary">{radiusMiles} mi</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setRadiusMiles(Math.max(1, radiusMiles - 5))}
              className="icon-btn"
            >
              <ZoomIn className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="100"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={() => setRadiusMiles(Math.min(100, radiusMiles + 5))}
              className="icon-btn"
            >
              <ZoomOut className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-2.5 rounded-xl bg-jury-primary hover:bg-jury-primary-dark transition-colors"
              title="Save this radius"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Map Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card-base overflow-hidden"
          style={{ height: '400px' }}
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
              <p className="mt-3 text-gray-400 text-sm">Loading heatmap data...</p>
            </div>
          ) : (
            <JuryMap
              centerLat={mapLat!}
              centerLng={mapLng!}
              radiusMiles={radiusMiles}
              points={data?.points || []}
              userCount={data?.stats.userCount || 0}
            />
          )}
        </motion.div>

        {/* Stats Grid */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="stat-card">
              <Users className="w-5 h-5 text-jury-primary mx-auto mb-2" />
              <div className="stat-value text-jury-primary">{data.stats.userCount}</div>
              <div className="stat-label">Nearby</div>
            </div>
            <div className="stat-card">
              <TrendingUp className="w-5 h-5 text-jury-approve mx-auto mb-2" />
              <div className="stat-value text-jury-approve">{Math.round(data.stats.avgAlignment * 100)}%</div>
              <div className="stat-label">Aligned</div>
            </div>
            <div className="stat-card">
              <BarChart3 className="w-5 h-5 text-jury-secondary mx-auto mb-2" />
              <div className="stat-value text-jury-secondary">{data.stats.totalVotes}</div>
              <div className="stat-label">Votes</div>
            </div>
          </motion.div>
        )}

        {/* Low Data Warning */}
        {data && data.stats.userCount < 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
          >
            <p className="text-yellow-400 text-sm">
              <strong>Low data:</strong> Only {data.stats.userCount} user
              {data.stats.userCount !== 1 ? 's' : ''} found in this area. Results may not be representative.
            </p>
          </motion.div>
        )}

        {/* Alignment Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-base p-5"
        >
          <p className="text-sm font-medium text-gray-300 mb-3">Alignment Scale</p>
          <div className="h-4 rounded-full overflow-hidden heatmap-gradient shadow-inner" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Opposing</span>
            <span>Neutral</span>
            <span>Aligned</span>
          </div>
        </motion.div>
      </main>

      {/* Save Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card-base p-6 w-full max-w-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Save This Radius</h3>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="icon-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <input
                type="text"
                value={radiusName}
                onChange={(e) => setRadiusName(e.target.value)}
                placeholder="e.g., Home, Work, Downtown"
                className="input-field"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRadius}
                  disabled={!radiusName.trim()}
                  className="btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
