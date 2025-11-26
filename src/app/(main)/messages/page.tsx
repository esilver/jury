'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Loader2, Users, ChevronRight, MessageSquare, Heart, Zap } from 'lucide-react'
import Link from 'next/link'

interface MatchWithMessages {
  id: string
  type: 'SIMILAR' | 'OPPOSITE'
  score: number
  otherUser: {
    id: string
    displayName?: string
    avatarUrl?: string
  }
  lastMessage?: {
    text: string
    createdAt: string
    isFromMe: boolean
  }
  unreadCount: number
  createdAt: string
}

export default function MessagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await fetch('/api/matches')
      if (!res.ok) throw new Error('Failed to fetch matches')
      return res.json() as Promise<{ matches: MatchWithMessages[] }>
    },
  })

  return (
    <div className="min-h-screen pb-24">
      <Header title="Messages" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
            <p className="mt-4 text-gray-400">Loading matches...</p>
          </div>
        ) : !data?.matches?.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-10 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-jury-primary/20 to-jury-secondary/20 flex items-center justify-center">
              <Users className="w-10 h-10 text-jury-primary animate-float" />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-white">No Matches Yet</h2>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto">
              Keep voting on prompts to find people with similar (or delightfully opposite) views!
            </p>
            <Link href="/feed" className="btn-primary inline-flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Browse Prompts
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {data.matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/messages/${match.id}`}
                  className="card-base-interactive p-4 flex items-center gap-4 block"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`
                      avatar avatar-md font-bold text-white
                      ${match.type === 'SIMILAR'
                        ? 'bg-gradient-to-br from-jury-approve/30 to-jury-approve-dark/30 border-jury-approve/50'
                        : 'bg-gradient-to-br from-jury-secondary/30 to-jury-disapprove/30 border-jury-secondary/50'
                      }
                    `}>
                      {match.otherUser.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={match.otherUser.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{match.otherUser.displayName?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    {/* Match type badge */}
                    <div
                      className={`
                        absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center
                        ${match.type === 'SIMILAR'
                          ? 'bg-gradient-to-br from-jury-approve to-jury-approve-dark'
                          : 'bg-gradient-to-br from-jury-secondary to-jury-disapprove'
                        }
                        shadow-lg
                      `}
                    >
                      {match.type === 'SIMILAR' ? (
                        <Heart className="w-3 h-3 text-white" />
                      ) : (
                        <Zap className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate">
                        {match.otherUser.displayName || 'Anonymous'}
                      </span>
                      {match.lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTimeAgo(new Date(match.lastMessage.createdAt))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {match.lastMessage ? (
                        <p className="text-sm text-gray-400 truncate flex-1">
                          {match.lastMessage.isFromMe && (
                            <span className="text-gray-500">You: </span>
                          )}
                          {match.lastMessage.text}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`
                            text-sm font-medium
                            ${match.type === 'SIMILAR' ? 'text-jury-approve' : 'text-jury-secondary'}
                          `}>
                            {Math.round(match.score * 100)}%
                          </span>
                          <span className="text-sm text-gray-400">
                            {match.type === 'SIMILAR' ? 'aligned' : 'opposite'}
                          </span>
                        </div>
                      )}
                      {match.unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-jury-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {match.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
