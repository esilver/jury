'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import {
  Loader2,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Flag,
  Send,
  MoreHorizontal,
} from 'lucide-react'

interface PromptDetails {
  id: string
  text: string
  type: 'STATEMENT' | 'TWO_POLE' | 'MULTI_CHOICE'
  poleLeft?: string
  poleRight?: string
  choices: { id: string; text: string; order: number }[]
  voteCount: number
  approvePercent: number
  disapprovePercent: number
  userVote?: { value?: number; choiceIds?: string[] }
  createdAt: string
}

interface Comment {
  id: string
  text: string
  user: { id: string; displayName?: string; avatarUrl?: string }
  approveCount: number
  disapproveCount: number
  userReaction: number | null
  createdAt: string
}

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: promptId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const [showFlagDialog, setShowFlagDialog] = useState(false)

  // Fetch prompt details
  const { data: prompt, isLoading } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: async () => {
      const res = await fetch(`/api/prompts/${promptId}`)
      if (!res.ok) throw new Error('Failed to fetch prompt')
      return res.json() as Promise<PromptDetails>
    },
  })

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', promptId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?promptId=${promptId}`)
      if (!res.ok) {
        if (res.status === 403) return { comments: [], needsVote: true }
        throw new Error('Failed to fetch comments')
      }
      return res.json() as Promise<{ comments: Comment[]; needsVote?: boolean }>
    },
    enabled: !!prompt?.userVote,
  })

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, value }),
      })
      if (!res.ok) throw new Error('Failed to vote')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] })
      queryClient.invalidateQueries({ queryKey: ['comments', promptId] })
    },
  })

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, text: commentText }),
      })
      if (!res.ok) throw new Error('Failed to post comment')
      return res.json()
    },
    onSuccess: () => {
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['comments', promptId] })
    },
  })

  // Comment reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, value }: { commentId: string; value: number }) => {
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) throw new Error('Failed to react')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', promptId] })
    },
  })

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch('/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'PROMPT', promptId, reason }),
      })
      if (!res.ok) throw new Error('Failed to flag')
      return res.json()
    },
    onSuccess: () => {
      setShowFlagDialog(false)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Prompt not found</p>
      </div>
    )
  }

  const hasVoted = !!prompt.userVote

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-jury-background/80 backdrop-blur-lg border-b border-jury-surface-light">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-jury-surface rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFlagDialog(true)}
            className="p-2 -mr-2 hover:bg-jury-surface rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Prompt Card */}
        <div className="card-base p-6">
          <h1 className="text-2xl font-semibold mb-4">{prompt.text}</h1>

          <div className="text-sm text-gray-400 mb-6">
            {prompt.voteCount} vote{prompt.voteCount !== 1 ? 's' : ''}
          </div>

          {/* Results (shown after voting) */}
          {hasVoted && (
            <div className="mb-6">
              <div className="h-8 flex rounded-lg overflow-hidden">
                <div
                  className="bg-jury-disapprove flex items-center justify-center text-sm font-medium"
                  style={{ width: `${prompt.disapprovePercent}%` }}
                >
                  {prompt.disapprovePercent}%
                </div>
                <div
                  className="bg-jury-approve flex items-center justify-center text-sm font-medium"
                  style={{ width: `${prompt.approvePercent}%` }}
                >
                  {prompt.approvePercent}%
                </div>
              </div>
              <p className="text-center text-sm text-gray-400 mt-2">
                You voted{' '}
                <span className={(prompt.userVote?.value ?? 0) > 0 ? 'text-jury-approve' : 'text-jury-disapprove'}>
                  {(prompt.userVote?.value ?? 0) > 0 ? 'Approve' : 'Disapprove'}
                </span>
              </p>
            </div>
          )}

          {/* Vote Buttons */}
          {!hasVoted && (
            <div className="flex gap-4">
              <button
                onClick={() => voteMutation.mutate(-1)}
                disabled={voteMutation.isPending}
                className="btn-disapprove flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsDown className="w-5 h-5" />
                Disapprove
              </button>
              <button
                onClick={() => voteMutation.mutate(1)}
                disabled={voteMutation.isPending}
                className="btn-approve flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsUp className="w-5 h-5" />
                Approve
              </button>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Comments</h2>
          </div>

          {!hasVoted ? (
            <div className="card-base p-6 text-center text-gray-400">
              Vote on this prompt to see and add comments
            </div>
          ) : (
            <>
              {/* Comment Input */}
              <div className="card-base p-4 flex gap-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="input-field flex-1"
                />
                <button
                  onClick={() => commentMutation.mutate()}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Comments List */}
              {commentsData?.comments?.map((comment) => (
                <div key={comment.id} className="card-base p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-jury-surface-light flex items-center justify-center flex-shrink-0">
                      {comment.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.user.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold">
                          {comment.user.displayName?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {comment.user.displayName || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() =>
                            reactionMutation.mutate({ commentId: comment.id, value: 1 })
                          }
                          className={`flex items-center gap-1 text-sm ${
                            comment.userReaction === 1 ? 'text-jury-approve' : 'text-gray-400'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {comment.approveCount}
                        </button>
                        <button
                          onClick={() =>
                            reactionMutation.mutate({ commentId: comment.id, value: -1 })
                          }
                          className={`flex items-center gap-1 text-sm ${
                            comment.userReaction === -1 ? 'text-jury-disapprove' : 'text-gray-400'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          {comment.disapproveCount}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!commentsData?.comments || commentsData.comments.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Flag Dialog */}
      {showFlagDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-base p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-jury-disapprove" />
              <h3 className="text-lg font-semibold">Report Content</h3>
            </div>
            <p className="text-sm text-gray-400">
              Flag this prompt if it contains inappropriate content.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFlagDialog(false)}
                className="flex-1 py-2 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => flagMutation.mutate('Inappropriate content')}
                disabled={flagMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-jury-disapprove hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {flagMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  'Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
