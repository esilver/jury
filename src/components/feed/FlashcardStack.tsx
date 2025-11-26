'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Flashcard } from './Flashcard'
import type { PromptWithStats } from '@/types'

interface FlashcardStackProps {
  prompts: PromptWithStats[]
  onVote: (promptId: string, value: number) => Promise<void>
  onSkip: (promptId: string) => void
  onSave: (promptId: string) => Promise<void>
}

export function FlashcardStack({ prompts, onVote, onSkip, onSave }: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [lastVote, setLastVote] = useState<{ value: number; stats: PromptWithStats } | null>(null)

  const currentPrompt = prompts[currentIndex]

  const goToNext = useCallback(() => {
    setShowResults(false)
    setLastVote(null)
    setExitDirection(null)
    setCurrentIndex((prev) => prev + 1)
  }, [])

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentPrompt) return

      setExitDirection(direction)

      if (direction === 'left') {
        // Skip
        onSkip(currentPrompt.id)
        setTimeout(goToNext, 300)
      } else {
        // Save for later
        await onSave(currentPrompt.id)
        setTimeout(goToNext, 300)
      }
    },
    [currentPrompt, onSkip, onSave, goToNext]
  )

  const handleVote = useCallback(
    async (value: number) => {
      if (!currentPrompt) return

      await onVote(currentPrompt.id, value)

      // Show results briefly
      setLastVote({
        value,
        stats: {
          ...currentPrompt,
          // Mock stats for now - will come from API response
          approvePercent: value > 0 ? 65 : 35,
          disapprovePercent: value > 0 ? 35 : 65,
        },
      })
      setShowResults(true)

      // Auto-advance after showing results
      setTimeout(goToNext, 2000)
    },
    [currentPrompt, onVote, goToNext]
  )

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100

      if (info.offset.x < -threshold) {
        handleSwipe('left')
      } else if (info.offset.x > threshold) {
        handleSwipe('right')
      }
    },
    [handleSwipe]
  )

  if (!currentPrompt) {
    return null
  }

  return (
    <div className="relative h-[500px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPrompt.id}
          initial={{ opacity: 0, scale: 0.9, x: 50 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: exitDirection === 'left' ? -300 : exitDirection === 'right' ? 300 : 0,
            rotate: exitDirection === 'left' ? -10 : exitDirection === 'right' ? 10 : 0,
            transition: { duration: 0.3 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          <Flashcard
            prompt={showResults && lastVote ? lastVote.stats : currentPrompt}
            onVote={handleVote}
            showResults={showResults}
            userVote={lastVote?.value}
          />
        </motion.div>
      </AnimatePresence>

      {/* Swipe indicators */}
      <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 text-gray-500 text-sm opacity-50">
        ← Skip
      </div>
      <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-500 text-sm opacity-50">
        Save →
      </div>

      {/* Stack indicator */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-gray-400">
        {currentIndex + 1} / {prompts.length}
      </div>
    </div>
  )
}
