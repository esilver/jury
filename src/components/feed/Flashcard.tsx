'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
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

  const getTypeLabel = () => {
    switch (prompt.type) {
      case 'STATEMENT':
        return { label: 'Statement', icon: Sparkles }
      case 'TWO_POLE':
        return { label: 'Spectrum', icon: TrendingUp }
      default:
        return { label: 'Multi-Choice', icon: MessageCircle }
    }
  }

  const typeInfo = getTypeLabel()
  const TypeIcon = typeInfo.icon

  return (
    <div className="card-base h-full flex flex-col overflow-hidden">
      {/* Media Preview */}
      {hasMedia && (
        <div className="relative h-52 bg-gradient-to-br from-jury-surface-light to-jury-surface overflow-hidden">
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
              <ImageIcon className="w-12 h-12 text-gray-600" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-jury-surface via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col">
        {/* Header with badge and vote count */}
        <div className="flex items-center justify-between mb-5">
          <div className="badge-primary">
            <TypeIcon className="w-3 h-3" />
            {typeInfo.label}
          </div>
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {prompt.voteCount} vote{prompt.voteCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Prompt Text */}
        <div className="flex-1 flex items-center justify-center py-4">
          <h2 className="text-2xl font-semibold text-center leading-relaxed text-slate-800">
            {prompt.text}
          </h2>
        </div>

        {/* Two-Pole Labels */}
        {prompt.type === 'TWO_POLE' && prompt.poleLeft && prompt.poleRight && (
          <div className="flex justify-between items-center px-2 py-3 mb-4 rounded-xl bg-jury-surface-light/30">
            <span className="text-sm text-jury-disapprove-light font-medium">{prompt.poleLeft}</span>
            <div className="flex-1 mx-4 h-px bg-gradient-to-r from-jury-disapprove via-slate-300 to-jury-approve" />
            <span className="text-sm text-jury-approve-light font-medium">{prompt.poleRight}</span>
          </div>
        )}

        {/* Results Display */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Results Bar */}
            <div className="relative h-12 flex rounded-2xl overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${prompt.disapprovePercent || 50}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-gradient-to-r from-jury-disapprove to-jury-disapprove-light flex items-center justify-center relative"
              >
                {(prompt.disapprovePercent || 0) >= 20 && (
                  <span className="text-sm font-bold text-white drop-shadow-lg">
                    {prompt.disapprovePercent}%
                  </span>
                )}
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${prompt.approvePercent || 50}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-gradient-to-r from-jury-approve-light to-jury-approve flex items-center justify-center relative"
              >
                {(prompt.approvePercent || 0) >= 20 && (
                  <span className="text-sm font-bold text-white drop-shadow-lg">
                    {prompt.approvePercent}%
                  </span>
                )}
              </motion.div>
            </div>

            {/* User Vote Indicator */}
            <div className="text-center">
              <span className="text-sm text-slate-500">You voted </span>
              <span
                className={`text-sm font-semibold ${
                  userVote && userVote > 0 ? 'text-jury-approve' : 'text-jury-disapprove'
                }`}
              >
                {userVote && userVote > 0 ? 'Approve' : 'Disapprove'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Vote Buttons */}
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
                  className="btn-disapprove flex-1 flex items-center justify-center gap-2.5 py-4"
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span>Disapprove</span>
                </button>
                <button
                  onClick={() => handleVote(1)}
                  disabled={voting}
                  className="btn-approve flex-1 flex items-center justify-center gap-2.5 py-4"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span>Approve</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 pb-5 pt-4">
        <div className="divider mb-4" />
        <div className="flex items-center justify-between">
          <button className="icon-btn group">
            <MessageCircle className="w-5 h-5 text-gray-500 group-hover:text-jury-primary transition-colors" />
          </button>
          <button className="icon-btn group">
            <Share2 className="w-5 h-5 text-gray-500 group-hover:text-jury-primary transition-colors" />
          </button>
          <button className="icon-btn group">
            <MoreHorizontal className="w-5 h-5 text-slate-500 group-hover:text-slate-800 transition-colors" />
          </button>
        </div>
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
          className={`
            w-full p-4 rounded-xl text-left transition-all duration-200
            ${selected.has(choice.id)
              ? 'bg-jury-primary/15 border-2 border-jury-primary shadow-glow-primary'
              : 'bg-jury-surface-light border-2 border-transparent hover:border-slate-300 hover:bg-jury-surface-dark'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${selected.has(choice.id)
                ? 'border-jury-primary bg-jury-primary'
                : 'border-slate-400'
              }
            `}>
              {selected.has(choice.id) && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className={`font-medium ${selected.has(choice.id) ? 'text-slate-800' : 'text-slate-600'}`}>
              {choice.text}
            </span>
          </div>
        </button>
      ))}

      {selected.size > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          disabled={disabled}
          className="btn-primary w-full mt-4"
        >
          Submit Choice{selected.size > 1 ? 's' : ''}
        </motion.button>
      )}
    </div>
  )
}
