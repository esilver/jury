'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import {
  Loader2,
  Settings,
  LogOut,
  ThumbsUp,
  ThumbsDown,
  History,
  MapPin,
  Star,
  ChevronRight,
  Bookmark,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface UserStats {
  totalVotes: number
  totalPrompts: number
  approveRatio: number
  disapproveRatio: number
}

interface VoteHistory {
  id: string
  promptId: string
  promptText: string
  value: number
  createdAt: string
  versions: {
    version: number
    value: number
    createdAt: string
  }[]
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'saved'>('stats')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<UserStats>
    },
  })

  const { data: voteHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['vote-history'],
    queryFn: async () => {
      const res = await fetch('/api/votes')
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<{ votes: VoteHistory[] }>
    },
    enabled: activeTab === 'history',
  })

  const { data: savedPrompts, isLoading: savedLoading } = useQuery({
    queryKey: ['saved-prompts'],
    queryFn: async () => {
      const res = await fetch('/api/saved-prompts')
      if (!res.ok) throw new Error('Failed to fetch saved')
      return res.json()
    },
    enabled: activeTab === 'saved',
  })

  return (
    <div className="min-h-screen pb-24">
      <Header title="Profile" showLogo={false} showSettings />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="avatar avatar-xl font-bold text-jury-primary">
              {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {session?.user?.name || 'Anonymous User'}
              </h2>
              <p className="text-gray-400 text-sm">{session?.user?.email}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/settings" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Stats Summary */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
          </div>
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="stat-card">
              <div className="stat-value text-gradient-primary">{stats.totalVotes}</div>
              <div className="stat-label">Total Votes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-jury-secondary">{stats.totalPrompts}</div>
              <div className="stat-label">Prompts Created</div>
            </div>
            <div className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsUp className="w-4 h-4 text-jury-approve" />
                <span className="text-sm font-medium">Approve Rate</span>
              </div>
              <div className="h-2.5 bg-jury-surface-dark rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.approveRatio * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-jury-approve to-jury-approve-light rounded-full"
                />
              </div>
              <div className="text-right text-sm font-semibold text-jury-approve mt-2">
                {Math.round(stats.approveRatio * 100)}%
              </div>
            </div>
            <div className="card-base p-4">
              <div className="flex items-center gap-2 mb-3">
                <ThumbsDown className="w-4 h-4 text-jury-disapprove" />
                <span className="text-sm font-medium">Disapprove Rate</span>
              </div>
              <div className="h-2.5 bg-jury-surface-dark rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.disapproveRatio * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-jury-disapprove to-jury-disapprove-light rounded-full"
                />
              </div>
              <div className="text-right text-sm font-semibold text-jury-disapprove mt-2">
                {Math.round(stats.disapproveRatio * 100)}%
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Tabs */}
        <div className="card-base p-1.5 flex gap-1">
          {[
            { id: 'stats', label: 'Dashboard', icon: BarChart3 },
            { id: 'history', label: 'History', icon: History },
            { id: 'saved', label: 'Saved', icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'stats' | 'history' | 'saved')}
                className={`
                  flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${isActive
                    ? 'bg-jury-primary/15 text-jury-primary'
                    : 'text-gray-400 hover:text-white hover:bg-jury-surface-light/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'stats' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <Link href="/map" className="card-base-interactive p-4 flex items-center justify-between block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-jury-primary/15 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-jury-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Good Company Map</p>
                    <p className="text-sm text-gray-400">See alignment in your area</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>

              <Link href="/profile/radii" className="card-base-interactive p-4 flex items-center justify-between block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-jury-secondary/15 flex items-center justify-center">
                    <Star className="w-6 h-6 text-jury-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Saved Radii</p>
                    <p className="text-sm text-gray-400">Compare different areas</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
                </div>
              ) : voteHistory?.votes?.length ? (
                <div className="space-y-3">
                  {voteHistory.votes.map((vote, index) => (
                    <motion.div
                      key={vote.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card-base p-4"
                    >
                      <p className="font-medium text-white mb-3">{vote.promptText}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`
                            badge text-xs
                            ${vote.value > 0 ? 'badge-approve' : 'badge-disapprove'}
                          `}
                        >
                          {vote.value > 0 ? 'Approved' : 'Disapproved'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(vote.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {vote.versions && vote.versions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-jury-surface-light">
                          <p className="text-xs text-gray-500">
                            Revised {vote.versions.length} time{vote.versions.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  No vote history yet
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'saved' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {savedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
                </div>
              ) : savedPrompts?.prompts?.length ? (
                <div className="space-y-3">
                  {savedPrompts.prompts.map((item: { prompt: { id: string; text: string; voteCount: number }; savedAt: string }, index: number) => (
                    <motion.div
                      key={item.prompt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="card-base p-4"
                    >
                      <p className="font-medium text-white mb-3">{item.prompt.text}</p>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{item.prompt.voteCount} votes</span>
                        <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No saved prompts yet</p>
                  <p className="text-sm mt-1">Swipe right on prompts to save them!</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
