'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { FlashcardStack } from '@/components/feed/FlashcardStack'
import { FeedFilters } from '@/components/feed/FeedFilters'
import { Loader2 } from 'lucide-react'
import type { PromptWithStats, FeedFilters as FeedFiltersType } from '@/types'

export default function FeedPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FeedFiltersType>({
    sortBy: 'trending',
  })
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  // Fetch prompts for feed
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

  // Vote mutation
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

  // Save prompt mutation
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

  // Filter out skipped and already voted prompts
  const availablePrompts = data?.prompts.filter(
    (p) => !skippedIds.has(p.id) && !p.userVote
  ) || []

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Filters */}
        <FeedFilters filters={filters} onFiltersChange={setFilters} />

        {/* Feed */}
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
            </div>
          ) : availablePrompts.length === 0 ? (
            <div className="card-base p-8 text-center">
              <p className="text-gray-400 mb-4">No more prompts to show!</p>
              <button
                onClick={() => {
                  setSkippedIds(new Set())
                  refetch()
                }}
                className="btn-primary"
              >
                Refresh Feed
              </button>
            </div>
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
