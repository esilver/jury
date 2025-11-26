'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import {
  Loader2,
  Bell,
  Volume2,
  VolumeX,
  MapPin,
  Shield,
  Trash2,
  ArrowLeft,
} from 'lucide-react'

interface UserSettings {
  alertsPositive: boolean
  alertsNegative: boolean
  alertVolume: number
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [settings, setSettings] = useState<UserSettings>({
    alertsPositive: true,
    alertsNegative: true,
    alertVolume: 1.0,
  })

  // Fetch current settings
  const { data, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await fetch('/api/user/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      return res.json() as Promise<UserSettings>
    },
  })

  useEffect(() => {
    if (data) {
      setSettings(data)
    }
  }, [data])

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return res.json()
    },
  })

  const handleSettingChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveMutation.mutate(newSettings)
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-jury-background/80 backdrop-blur-lg border-b border-jury-surface-light">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-jury-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg ml-2">Settings</h1>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
          </div>
        ) : (
          <>
            {/* Notification Settings */}
            <div className="card-base p-4">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-jury-primary" />
                <h2 className="font-semibold">Match Alerts</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Similar matches</p>
                    <p className="text-sm text-gray-400">
                      Alert when someone nearby shares your views
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange('alertsPositive', !settings.alertsPositive)
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      settings.alertsPositive ? 'bg-jury-approve' : 'bg-jury-surface-light'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.alertsPositive ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Opposite matches</p>
                    <p className="text-sm text-gray-400">
                      Alert when someone nearby has opposite views
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange('alertsNegative', !settings.alertsNegative)
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      settings.alertsNegative ? 'bg-jury-disapprove' : 'bg-jury-surface-light'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.alertsNegative ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Alert Volume</p>
                    {settings.alertVolume > 0 ? (
                      <Volume2 className="w-4 h-4 text-gray-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.alertVolume}
                    onChange={(e) =>
                      handleSettingChange('alertVolume', parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-jury-surface-light rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="card-base p-4">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-jury-secondary" />
                <h2 className="font-semibold">Privacy</h2>
              </div>

              <div className="space-y-3 text-sm text-gray-400">
                <p>
                  Your location is rounded to approximately 1km to protect your privacy.
                </p>
                <p>
                  Your profile is anonymous until you choose to connect with matches.
                </p>
              </div>
            </div>

            {/* Location Settings */}
            <div className="card-base p-4">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-jury-primary" />
                <h2 className="font-semibold">Location</h2>
              </div>

              <button
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(() => {
                    // Refresh location
                  })
                }}
                className="w-full py-2 px-4 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors text-left"
              >
                Refresh Location
              </button>
            </div>

            {/* Danger Zone */}
            <div className="card-base p-4 border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-jury-disapprove" />
                <h2 className="font-semibold text-jury-disapprove">Danger Zone</h2>
              </div>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                    // Delete account
                  }
                }}
                className="w-full py-2 px-4 rounded-lg bg-jury-disapprove/20 hover:bg-jury-disapprove/30 text-jury-disapprove transition-colors"
              >
                Delete Account
              </button>
            </div>

            {saveMutation.isPending && (
              <div className="text-center text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Saving...
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
