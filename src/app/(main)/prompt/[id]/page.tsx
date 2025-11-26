'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Flag,
  Send,
  MoreHorizontal,
  X,
  AlertTriangle,
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

  const { data: prompt, isLoading } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: async () => {
      const res = await fetch(`/api/prompts/${promptId}`)
      if (!res.ok) throw new Error('Failed to fetch prompt')
      return res.json() as Promise<PromptDetails>
    },
  })

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
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
        <p className="mt-4 text-gray-400">Loading prompt...</p>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-400">Prompt not found</p>
      </div>
    )
  }

  const hasVoted = !!prompt.userVote

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-strong">
        <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="icon-btn -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFlagDialog(true)}
            className="icon-btn -mr-2"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-jury-primary/30 to-transparent" />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Prompt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <h1 className="text-2xl font-bold text-white mb-4 leading-relaxed">{prompt.text}</h1>

          <div className="text-sm text-gray-400 mb-6">
            {prompt.voteCount} vote{prompt.voteCount !== 1 ? 's' : ''}
          </div>

          {/* Results (shown after voting) */}
          {hasVoted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="h-12 flex rounded-2xl overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prompt.disapprovePercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-jury-disapprove to-jury-disapprove-light flex items-center justify-center"
                >
                  {prompt.disapprovePercent >= 15 && (
                    <span className="text-sm font-bold text-white drop-shadow">{prompt.disapprovePercent}%</span>
                  )}
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prompt.approvePercent}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-jury-approve-light to-jury-approve flex items-center justify-center"
                >
                  {prompt.approvePercent >= 15 && (
                    <span className="text-sm font-bold text-white drop-shadow">{prompt.approvePercent}%</span>
                  )}
                </motion.div>
              </div>
              <p className="text-center text-sm text-gray-400 mt-3">
                You voted{' '}
                <span className={(prompt.userVote?.value ?? 0) > 0 ? 'text-jury-approve font-medium' : 'text-jury-disapprove font-medium'}>
                  {(prompt.userVote?.value ?? 0) > 0 ? 'Approve' : 'Disapprove'}
                </span>
              </p>
            </motion.div>
          )}

          {/* Vote Buttons */}
          {!hasVoted && (
            <div className="flex gap-4">
              <button
                onClick={() => voteMutation.mutate(-1)}
                disabled={voteMutation.isPending}
                className="btn-disapprove flex-1 flex items-center justify-center gap-2 py-4"
              >
                <ThumbsDown className="w-5 h-5" />
                Disapprove
              </button>
              <button
                onClick={() => voteMutation.mutate(1)}
                disabled={voteMutation.isPending}
                className="btn-approve flex-1 flex items-center justify-center gap-2 py-4"
              >
                <ThumbsUp className="w-5 h-5" />
                Approve
              </button>
            </div>
          )}
        </motion.div>

        {/* Comments Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-jury-primary" />
            <h2 className="font-bold text-white">Comments</h2>
          </div>

          {!hasVoted ? (
            <div className="card-base p-8 text-center">
              <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Vote on this prompt to see and add comments</p>
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
                  className="btn-primary px-4"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Comments List */}
              {commentsData?.comments?.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-base p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="avatar avatar-sm font-bold text-white">
                      {comment.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.user.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span>{comment.user.displayName?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-white">
                          {comment.user.displayName || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <button
                          onClick={() =>
                            reactionMutation.mutate({ commentId: comment.id, value: 1 })
                          }
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            comment.userReaction === 1 ? 'text-jury-approve' : 'text-gray-500 hover:text-jury-approve'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {comment.approveCount}
                        </button>
                        <button
                          onClick={() =>
                            reactionMutation.mutate({ commentId: comment.id, value: -1 })
                          }
                          className={`flex items-center gap-1.5 text-sm transition-colors ${
                            comment.userReaction === -1 ? 'text-jury-disapprove' : 'text-gray-500 hover:text-jury-disapprove'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          {comment.disapproveCount}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {(!commentsData?.comments || commentsData.comments.length === 0) && (
                <div className="text-center py-10 text-gray-400">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No comments yet</p>
                  <p className="text-sm mt-1">Be the first to share your thoughts!</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Flag Dialog */}
      <AnimatePresence>
        {showFlagDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card-base p-6 w-full max-w-sm space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-jury-disapprove/15 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-jury-disapprove" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Report Content</h3>
                </div>
                <button onClick={() => setShowFlagDialog(false)} className="icon-btn">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-200">
                  Only flag this content if it violates community guidelines.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFlagDialog(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => flagMutation.mutate('Inappropriate content')}
                  disabled={flagMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-jury-disapprove hover:bg-jury-disapprove-dark text-white font-medium transition-colors"
                >
                  {flagMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Report'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
