'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon } from 'lucide-react'
import type { PromptWithStats } from '@/types'

interface FlashcardProps {
  prompt: PromptWithStats
  onVote: (value: number) => Promise<void>
  showResults?: boolean
  userVote?: number
}

export function Flashcard({ prompt, onVote, showResults = false, userVote }: FlashcardProps) {
  const [voting, setVoting] = useState(false)

  const handleVote = async (value: number) => {
    if (voting || showResults) return
    setVoting(true)
    try {
      await onVote(value)
    } finally {
      setVoting(false)
    }
  }

  const hasMedia = prompt.mediaAttachments && prompt.mediaAttachments.length > 0

  return (
    <div className="card-base h-full flex flex-col">
      {/* Media Preview */}
      {hasMedia && (
        <div className="relative h-48 bg-jury-surface-light rounded-t-2xl overflow-hidden">
          {prompt.mediaAttachments[0].type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prompt.mediaAttachments[0].url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : prompt.mediaAttachments[0].type === 'video' ? (
            <video
              src={prompt.mediaAttachments[0].url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col">
        {/* Prompt Type Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-jury-surface-light text-gray-400">
            {prompt.type === 'STATEMENT'
              ? 'Statement'
              : prompt.type === 'TWO_POLE'
              ? 'Spectrum'
              : 'Multi-Choice'}
          </span>
          <span className="text-xs text-gray-500">
            {prompt.voteCount} vote{prompt.voteCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Prompt Text */}
        <div className="flex-1 flex items-center justify-center">
          <h2 className="text-2xl font-semibold text-center leading-tight">
            {prompt.text}
          </h2>
        </div>

        {/* Two-Pole Labels */}
        {prompt.type === 'TWO_POLE' && prompt.poleLeft && prompt.poleRight && (
          <div className="flex justify-between text-sm text-gray-400 mt-4">
            <span>{prompt.poleLeft}</span>
            <span>{prompt.poleRight}</span>
          </div>
        )}

        {/* Results Display */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3"
          >
            {/* Bar Chart */}
            <div className="h-8 flex rounded-lg overflow-hidden">
              <div
                className="bg-jury-disapprove flex items-center justify-center text-sm font-medium"
                style={{ width: `${prompt.disapprovePercent || 50}%` }}
              >
                {prompt.disapprovePercent}%
              </div>
              <div
                className="bg-jury-approve flex items-center justify-center text-sm font-medium"
                style={{ width: `${prompt.approvePercent || 50}%` }}
              >
                {prompt.approvePercent}%
              </div>
            </div>

            {/* User Position Indicator */}
            <div className="text-center text-sm">
              <span className="text-gray-400">You voted </span>
              <span className={userVote && userVote > 0 ? 'text-jury-approve' : 'text-jury-disapprove'}>
                {userVote && userVote > 0 ? 'Approve' : 'Disapprove'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Vote Buttons (only show if not showing results) */}
        {!showResults && (
          <div className="mt-6">
            {prompt.type === 'MULTI_CHOICE' && prompt.choices ? (
              <MultiChoiceOptions
                choices={prompt.choices}
                mode={prompt.multiChoiceMode}
                onVote={onVote}
                disabled={voting}
              />
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => handleVote(-1)}
                  disabled={voting}
                  className="btn-disapprove flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ThumbsDown className="w-5 h-5" />
                  Disapprove
                </button>
                <button
                  onClick={() => handleVote(1)}
                  disabled={voting}
                  className="btn-approve flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ThumbsUp className="w-5 h-5" />
                  Approve
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 pb-4 flex items-center justify-between border-t border-jury-surface-light pt-4">
        <button className="p-2 hover:bg-jury-surface-light rounded-lg transition-colors">
          <MessageCircle className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 hover:bg-jury-surface-light rounded-lg transition-colors">
          <Share2 className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 hover:bg-jury-surface-light rounded-lg transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

interface MultiChoiceOptionsProps {
  choices: { id: string; text: string; order: number }[]
  mode?: 'SINGLE_SELECT' | 'MULTI_SELECT' | null
  onVote: (value: number) => Promise<void>
  disabled: boolean
}

function MultiChoiceOptions({ choices, mode, onVote, disabled }: MultiChoiceOptionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleSelect = (choiceId: string) => {
    if (mode === 'SINGLE_SELECT') {
      setSelected(new Set([choiceId]))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(choiceId)) {
          next.delete(choiceId)
        } else {
          next.add(choiceId)
        }
        return next
      })
    }
  }

  const handleSubmit = async () => {
    if (selected.size === 0) return
    // For multi-choice, we encode the selection differently
    // This is a simplified version - actual implementation would be more complex
    await onVote(0)
  }

  const sortedChoices = [...choices].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      {sortedChoices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => handleSelect(choice.id)}
          disabled={disabled}
          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
            selected.has(choice.id)
              ? 'border-jury-primary bg-jury-primary/10'
              : 'border-jury-surface-light hover:border-gray-500'
          }`}
        >
          {choice.text}
        </button>
      ))}

      {selected.size > 0 && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="btn-primary w-full"
        >
          Submit
        </button>
      )}
    </div>
  )
}
