'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { FlashcardStack } from '@/components/feed/FlashcardStack'
import { FeedFilters } from '@/components/feed/FeedFilters'
import { Loader2, RefreshCw, Sparkles, Scale } from 'lucide-react'
import type { PromptWithStats, FeedFilters as FeedFiltersType } from '@/types'

export default function FeedPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FeedFiltersType>({
    sortBy: 'trending',
  })
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: filters.sortBy,
        ...(filters.radiusMiles && { radius: filters.radiusMiles.toString() }),
        ...(filters.latitude && { lat: filters.latitude.toString() }),
        ...(filters.longitude && { lng: filters.longitude.toString() }),
      })

      const res = await fetch(`/api/feed?${params}`)
      if (!res.ok) throw new Error('Failed to fetch feed')
      return res.json() as Promise<{ prompts: PromptWithStats[] }>
    },
  })

  const voteMutation = useMutation({
    mutationFn: async ({ promptId, value }: { promptId: string; value: number }) => {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, value }),
      })
      if (!res.ok) throw new Error('Failed to vote')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await fetch('/api/saved-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId }),
      })
      if (!res.ok) throw new Error('Failed to save prompt')
      return res.json()
    },
  })

  const handleVote = useCallback(
    async (promptId: string, value: number) => {
      await voteMutation.mutateAsync({ promptId, value })
    },
    [voteMutation]
  )

  const handleSkip = useCallback((promptId: string) => {
    setSkippedIds((prev) => new Set([...prev, promptId]))
  }, [])

  const handleSave = useCallback(
    async (promptId: string) => {
      await saveMutation.mutateAsync(promptId)
    },
    [saveMutation]
  )

  const availablePrompts = data?.prompts.filter(
    (p) => !skippedIds.has(p.id) && !p.userVote
  ) || []

  return (
    <div className="min-h-screen pb-24">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <FeedFilters filters={filters} onFiltersChange={setFilters} />
          <button
            onClick={() => {
              setSkippedIds(new Set())
              refetch()
            }}
            className="icon-btn"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Feed Content */}
        <div className="mt-2">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-[480px] card-base"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-jury-primary/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="w-12 h-12 animate-spin text-jury-primary relative" />
              </div>
              <p className="mt-4 text-gray-400">Loading prompts...</p>
            </motion.div>
          ) : availablePrompts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-10 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-jury-primary/20 to-jury-secondary/20 flex items-center justify-center">
                <Scale className="w-10 h-10 text-jury-primary animate-float" />
              </div>
              <h2 className="text-xl font-semibold mb-3 text-white">All caught up!</h2>
              <p className="text-gray-400 mb-6 max-w-xs mx-auto">
                You&apos;ve seen all the prompts. Check back later or create your own!
              </p>
              <button
                onClick={() => {
                  setSkippedIds(new Set())
                  refetch()
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Feed
              </button>
            </motion.div>
          ) : (
            <FlashcardStack
              prompts={availablePrompts}
              onVote={handleVote}
              onSkip={handleSkip}
              onSave={handleSave}
            />
          )}
        </div>
      </main>
    </div>
  )
}
