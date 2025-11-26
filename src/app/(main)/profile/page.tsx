'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
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

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<UserStats>
    },
  })

  // Fetch vote history
  const { data: voteHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['vote-history'],
    queryFn: async () => {
      const res = await fetch('/api/votes')
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<{ votes: VoteHistory[] }>
    },
    enabled: activeTab === 'history',
  })

  // Fetch saved prompts
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
    <div className="min-h-screen">
      <Header title="Profile" showLogo={false} showSettings />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="card-base p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-jury-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-jury-primary">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {session?.user?.name || 'Anonymous User'}
              </h2>
              <p className="text-gray-400 text-sm">{session?.user?.email}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Link href="/settings" className="flex-1 btn-primary text-center">
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex-1 py-2 px-4 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-jury-primary" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <div className="text-xs text-gray-400">Total Votes</div>
            </div>
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalPrompts}</div>
              <div className="text-xs text-gray-400">Prompts Created</div>
            </div>
            <div className="card-base p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-4 h-4 text-jury-approve" />
                <span className="text-sm">Approve Rate</span>
              </div>
              <div className="h-2 bg-jury-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-jury-approve"
                  style={{ width: `${stats.approveRatio * 100}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {Math.round(stats.approveRatio * 100)}%
              </div>
            </div>
            <div className="card-base p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="w-4 h-4 text-jury-disapprove" />
                <span className="text-sm">Disapprove Rate</span>
              </div>
              <div className="h-2 bg-jury-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-jury-disapprove"
                  style={{ width: `${stats.disapproveRatio * 100}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">
                {Math.round(stats.disapproveRatio * 100)}%
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex border-b border-jury-surface-light">
          {[
            { id: 'stats', label: 'Dashboard', icon: Star },
            { id: 'history', label: 'History', icon: History },
            { id: 'saved', label: 'Saved', icon: MapPin },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'stats' | 'history' | 'saved')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'border-jury-primary text-jury-primary'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <Link href="/map" className="card-base p-4 flex items-center justify-between hover:bg-jury-surface-light transition-colors">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-jury-primary" />
                  <div>
                    <p className="font-medium">Good Company Map</p>
                    <p className="text-sm text-gray-400">See alignment in your area</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>

              <Link href="/profile/radii" className="card-base p-4 flex items-center justify-between hover:bg-jury-surface-light transition-colors">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-jury-secondary" />
                  <div>
                    <p className="font-medium">Saved Radii</p>
                    <p className="text-sm text-gray-400">Compare different areas</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          )}

          {activeTab === 'history' && (
            <>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-jury-primary" />
                </div>
              ) : voteHistory?.votes?.length ? (
                voteHistory.votes.map((vote) => (
                  <div key={vote.id} className="card-base p-4">
                    <p className="font-medium mb-2">{vote.promptText}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={
                          vote.value > 0 ? 'text-jury-approve' : 'text-jury-disapprove'
                        }
                      >
                        {vote.value > 0 ? 'Approved' : 'Disapproved'}
                      </span>
                      <span className="text-gray-400">
                        {new Date(vote.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {vote.versions && vote.versions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-jury-surface-light">
                        <p className="text-xs text-gray-500">
                          Revised {vote.versions.length} time{vote.versions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No vote history yet
                </div>
              )}
            </>
          )}

          {activeTab === 'saved' && (
            <>
              {savedLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-jury-primary" />
                </div>
              ) : savedPrompts?.prompts?.length ? (
                savedPrompts.prompts.map((item: { prompt: { id: string; text: string; voteCount: number }; savedAt: string }) => (
                  <div key={item.prompt.id} className="card-base p-4">
                    <p className="font-medium mb-2">{item.prompt.text}</p>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{item.prompt.voteCount} votes</span>
                      <span>Saved {new Date(item.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No saved prompts yet. Swipe right on prompts to save them!
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
