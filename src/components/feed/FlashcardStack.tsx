'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Flashcard } from './Flashcard'
import { ChevronLeft, ChevronRight, Bookmark, X } from 'lucide-react'
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
  const [dragX, setDragX] = useState(0)

  const currentPrompt = prompts[currentIndex]

  const goToNext = useCallback(() => {
    setShowResults(false)
    setLastVote(null)
    setExitDirection(null)
    setDragX(0)
    setCurrentIndex((prev) => prev + 1)
  }, [])

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentPrompt) return

      setExitDirection(direction)

      if (direction === 'left') {
        onSkip(currentPrompt.id)
        setTimeout(goToNext, 300)
      } else {
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

      setLastVote({
        value,
        stats: {
          ...currentPrompt,
          approvePercent: value > 0 ? 65 : 35,
          disapprovePercent: value > 0 ? 35 : 65,
        },
      })
      setShowResults(true)

      setTimeout(goToNext, 2000)
    },
    [currentPrompt, onVote, goToNext]
  )

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setDragX(info.offset.x)
    },
    []
  )

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100

      if (info.offset.x < -threshold) {
        handleSwipe('left')
      } else if (info.offset.x > threshold) {
        handleSwipe('right')
      } else {
        setDragX(0)
      }
    },
    [handleSwipe]
  )

  if (!currentPrompt) {
    return null
  }

  const swipeOpacity = Math.min(Math.abs(dragX) / 100, 1)
  const isSwipingLeft = dragX < -30
  const isSwipingRight = dragX > 30

  return (
    <div className="relative h-[520px]">
      {/* Swipe Indicators (behind card) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Skip Indicator */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center"
          style={{ opacity: isSwipingLeft ? swipeOpacity : 0 }}
        >
          <div className="p-4 rounded-2xl bg-jury-disapprove/20 backdrop-blur-sm">
            <X className="w-8 h-8 text-jury-disapprove" />
          </div>
        </motion.div>

        {/* Save Indicator */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center"
          style={{ opacity: isSwipingRight ? swipeOpacity : 0 }}
        >
          <div className="p-4 rounded-2xl bg-jury-approve/20 backdrop-blur-sm">
            <Bookmark className="w-8 h-8 text-jury-approve" />
          </div>
        </motion.div>
      </div>

      {/* Card Stack */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPrompt.id}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: dragX * 0.03,
          }}
          exit={{
            opacity: 0,
            x: exitDirection === 'left' ? -300 : exitDirection === 'right' ? 300 : 0,
            rotate: exitDirection === 'left' ? -15 : exitDirection === 'right' ? 15 : 0,
            transition: { duration: 0.3, ease: 'easeOut' },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            x: dragX,
          }}
        >
          <Flashcard
            prompt={showResults && lastVote ? lastVote.stats : currentPrompt}
            onVote={handleVote}
            showResults={showResults}
            userVote={lastVote?.value}
          />
        </motion.div>
      </AnimatePresence>

      {/* Swipe hints */}
      <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <ChevronLeft className="w-4 h-4" />
          <span>Skip</span>
        </div>

        {/* Card Counter */}
        <div className="flex items-center gap-1.5">
          {[...Array(Math.min(prompts.length, 5))].map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex % 5
                  ? 'w-6 bg-jury-primary'
                  : 'w-1.5 bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span>Save</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}
