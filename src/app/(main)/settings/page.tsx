'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Loader2,
  Bell,
  Volume2,
  VolumeX,
  MapPin,
  Shield,
  Trash2,
  ArrowLeft,
  Check,
  Heart,
  Zap,
  RefreshCw,
} from 'lucide-react'

interface UserSettings {
  alertsPositive: boolean
  alertsNegative: boolean
  alertVolume: number
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>({
    alertsPositive: true,
    alertsNegative: true,
    alertVolume: 1.0,
  })

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
    <div className="min-h-screen pb-24">
      {/* Custom Header */}
      <div className="sticky top-0 z-50 glass-strong">
        <div className="flex items-center h-16 px-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="icon-btn -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg ml-3 text-white">Settings</h1>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-jury-primary/30 to-transparent" />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
            <p className="mt-4 text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <>
            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-5"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-jury-primary/15 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-jury-primary" />
                </div>
                <h2 className="font-bold text-white">Match Alerts</h2>
              </div>

              <div className="space-y-5">
                {/* Similar Matches Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-jury-approve" />
                    <div>
                      <p className="font-medium text-white">Similar matches</p>
                      <p className="text-sm text-gray-400">
                        Alert for people who share your views
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange('alertsPositive', !settings.alertsPositive)
                    }
                    className={`toggle ${settings.alertsPositive ? 'active' : ''}`}
                  />
                </div>

                <div className="divider" />

                {/* Opposite Matches Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-jury-secondary" />
                    <div>
                      <p className="font-medium text-white">Opposite matches</p>
                      <p className="text-sm text-gray-400">
                        Alert for people with opposite views
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange('alertsNegative', !settings.alertsNegative)
                    }
                    className={`toggle ${settings.alertsNegative ? 'active' : ''}`}
                  />
                </div>

                <div className="divider" />

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-white">Alert Volume</p>
                    {settings.alertVolume > 0 ? (
                      <Volume2 className="w-5 h-5 text-jury-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-500" />
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
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Off</span>
                    <span>Max</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Privacy Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-base p-5"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-jury-secondary/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-jury-secondary" />
                </div>
                <h2 className="font-bold text-white">Privacy</h2>
              </div>

              <div className="space-y-4 text-sm text-gray-400">
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-jury-approve mt-0.5 flex-shrink-0" />
                  <p>Your location is rounded to approximately 1km to protect your privacy.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-jury-approve mt-0.5 flex-shrink-0" />
                  <p>Your profile is anonymous until you choose to connect with matches.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-jury-approve mt-0.5 flex-shrink-0" />
                  <p>Your votes are never shared publicly with your identity.</p>
                </div>
              </div>
            </motion.div>

            {/* Location Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-base p-5"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-jury-primary/15 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-jury-primary" />
                </div>
                <h2 className="font-bold text-white">Location</h2>
              </div>

              <button
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(() => {
                    // Refresh location
                  })
                }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Location
              </button>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-base p-5 border border-jury-disapprove/30"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-jury-disapprove/15 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-jury-disapprove" />
                </div>
                <h2 className="font-bold text-jury-disapprove">Danger Zone</h2>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                    // Delete account
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-jury-disapprove/15 hover:bg-jury-disapprove/25 text-jury-disapprove font-medium transition-colors border border-jury-disapprove/30"
              >
                Delete Account
              </button>
            </motion.div>

            {/* Saving Indicator */}
            {saveMutation.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-jury-surface border border-jury-surface-light shadow-lg flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin text-jury-primary" />
                <span className="text-sm text-gray-300">Saving...</span>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
