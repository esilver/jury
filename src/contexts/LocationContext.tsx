'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface LocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  granted: boolean
}

interface LocationContextType extends LocationState {
  requestLocation: () => Promise<boolean>
  updateLocation: () => void
}

const LocationContext = createContext<LocationContextType | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    granted: false,
  })

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Round to ~1km precision for privacy
        const lat = Math.round(position.coords.latitude * 100) / 100
        const lng = Math.round(position.coords.longitude * 100) / 100

        setState({
          latitude: lat,
          longitude: lng,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
          granted: true,
        })
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          granted: false,
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    )
  }, [])

  const requestLocation = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          error: 'Geolocation not supported',
        }))
        resolve(false)
        return
      }

      setState((prev) => ({ ...prev, loading: true }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Math.round(position.coords.latitude * 100) / 100
          const lng = Math.round(position.coords.longitude * 100) / 100

          setState({
            latitude: lat,
            longitude: lng,
            accuracy: position.coords.accuracy,
            error: null,
            loading: false,
            granted: true,
          })
          resolve(true)
        },
        (error) => {
          let errorMessage = 'Failed to get location'
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied'
          }
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            loading: false,
            granted: false,
          }))
          resolve(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      )
    })
  }, [])

  // Check for stored permission on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          updateLocation()
        }
      }).catch(() => {
        // Permissions API not available
      })
    }
  }, [updateLocation])

  return (
    <LocationContext.Provider
      value={{
        ...state,
        requestLocation,
        updateLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
