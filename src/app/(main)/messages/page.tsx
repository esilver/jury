'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { Loader2, MessageCircle, Users, ChevronRight } from 'lucide-react'
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
    <div className="min-h-screen">
      <Header title="Messages" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
          </div>
        ) : !data?.matches?.length ? (
          <div className="card-base p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-jury-surface-light flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Matches Yet</h2>
            <p className="text-gray-400 mb-6">
              Keep voting on prompts to find people with similar (or delightfully opposite) views!
            </p>
            <Link href="/feed" className="btn-primary inline-block">
              Browse Prompts
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.matches.map((match) => (
              <Link
                key={match.id}
                href={`/messages/${match.id}`}
                className="card-base p-4 flex items-center gap-4 hover:bg-jury-surface-light transition-colors"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-jury-surface-light flex items-center justify-center">
                    {match.otherUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={match.otherUser.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {match.otherUser.displayName?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  {/* Match type indicator */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      match.type === 'SIMILAR'
                        ? 'bg-jury-approve text-white'
                        : 'bg-jury-disapprove text-white'
                    }`}
                  >
                    {match.type === 'SIMILAR' ? '=' : '≠'}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">
                      {match.otherUser.displayName || 'Anonymous'}
                    </span>
                    {match.lastMessage && (
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(new Date(match.lastMessage.createdAt))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {match.lastMessage ? (
                      <p className="text-sm text-gray-400 truncate flex-1">
                        {match.lastMessage.isFromMe && 'You: '}
                        {match.lastMessage.text}
                      </p>
                    ) : (
                      <p className="text-sm text-jury-primary">
                        {Math.round(match.score * 100)}% {match.type === 'SIMILAR' ? 'aligned' : 'opposite'}
                      </p>
                    )}
                    {match.unreadCount > 0 && (
                      <span className="bg-jury-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {match.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </Link>
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
