'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import {
  Loader2,
  Plus,
  X,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  TrendingUp,
  List,
  Send,
  Video,
  Link as LinkIcon,
} from 'lucide-react'

type PromptType = 'STATEMENT' | 'TWO_POLE' | 'MULTI_CHOICE'
type MultiChoiceMode = 'SINGLE_SELECT' | 'MULTI_SELECT'

interface SimilarPrompt {
  id: string
  text: string
  voteCount: number
  score?: number
}

const promptTypes = [
  { value: 'STATEMENT', label: 'Statement', icon: Sparkles, description: 'Agree or disagree' },
  { value: 'TWO_POLE', label: 'Spectrum', icon: TrendingUp, description: 'Scale between two options' },
  { value: 'MULTI_CHOICE', label: 'Multiple Choice', icon: List, description: 'Pick from options' },
] as const

export default function CreatePromptPage() {
  const router = useRouter()
  const [promptType, setPromptType] = useState<PromptType>('STATEMENT')
  const [text, setText] = useState('')
  const [poleLeft, setPoleLeft] = useState('')
  const [poleRight, setPoleRight] = useState('')
  const [multiChoiceMode, setMultiChoiceMode] = useState<MultiChoiceMode>('SINGLE_SELECT')
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('image')
  const [showMediaInput, setShowMediaInput] = useState(false)
  const [debouncedText, setDebouncedText] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.length >= 3) {
        setDebouncedText(text)
      } else {
        setDebouncedText('')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [text])

  const { data: similarPrompts } = useQuery({
    queryKey: ['similar-prompts', debouncedText],
    queryFn: async () => {
      if (!debouncedText) return { prompts: [] }
      const res = await fetch(`/api/prompts?search=${encodeURIComponent(debouncedText)}&limit=5`)
      if (!res.ok) throw new Error('Failed to search')
      return res.json() as Promise<{ prompts: SimilarPrompt[] }>
    },
    enabled: debouncedText.length >= 3,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        text,
        type: promptType,
      }

      if (promptType === 'TWO_POLE') {
        payload.poleLeft = poleLeft
        payload.poleRight = poleRight
      }

      if (promptType === 'MULTI_CHOICE') {
        payload.multiChoiceMode = multiChoiceMode
        payload.choices = choices.filter((c) => c.trim())
      }

      if (mediaUrl) {
        payload.mediaUrls = [{ type: mediaType, url: mediaUrl }]
      }

      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create prompt')
      }

      return res.json()
    },
    onSuccess: () => {
      router.push('/feed')
    },
  })

  const handleAddChoice = () => {
    if (choices.length < 5) {
      setChoices([...choices, ''])
    }
  }

  const handleRemoveChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index))
    }
  }

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }

  const isValid = () => {
    if (!text.trim()) return false
    if (promptType === 'TWO_POLE' && (!poleLeft.trim() || !poleRight.trim())) return false
    if (promptType === 'MULTI_CHOICE') {
      const validChoices = choices.filter((c) => c.trim())
      if (validChoices.length < 2) return false
    }
    return true
  }

  const handleExistingPrompt = (promptId: string) => {
    router.push(`/prompt/${promptId}`)
  }

  return (
    <div className="min-h-screen pb-24">
      <Header title="Create Prompt" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Prompt Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Prompt Type</label>
          <div className="grid grid-cols-3 gap-3">
            {promptTypes.map((type) => {
              const Icon = type.icon
              const isActive = promptType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setPromptType(type.value as PromptType)}
                  className={`
                    p-4 rounded-xl text-center transition-all duration-200
                    ${isActive
                      ? 'bg-jury-primary/15 border-2 border-jury-primary shadow-glow-primary'
                      : 'bg-jury-surface-light/40 border-2 border-transparent hover:border-gray-600 hover:bg-jury-surface-light/60'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? 'text-jury-primary' : 'text-gray-400'}`} />
                  <span className={`block text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt Text */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {promptType === 'STATEMENT' ? 'Your Statement' : 'Your Question'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              promptType === 'STATEMENT'
                ? 'e.g., "Pineapple belongs on pizza"'
                : 'e.g., "How do you prefer to work?"'
            }
            className="input-field h-28 resize-none"
          />

          {/* Similar Prompts Alert */}
          <AnimatePresence>
            {similarPrompts && similarPrompts.prompts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
              >
                <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>Similar prompts exist</span>
                </div>
                <ul className="space-y-2">
                  {similarPrompts.prompts.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleExistingPrompt(p.id)}
                        className="text-left text-sm text-gray-300 hover:text-white w-full p-3 rounded-lg bg-jury-surface/50 hover:bg-jury-surface transition-colors"
                      >
                        {p.text}
                        <span className="text-gray-500 ml-2 text-xs">({p.voteCount} votes)</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Two-Pole Options */}
        <AnimatePresence>
          {promptType === 'TWO_POLE' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Left Pole</label>
                  <input
                    type="text"
                    value={poleLeft}
                    onChange={(e) => setPoleLeft(e.target.value)}
                    placeholder="e.g., Never"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Right Pole</label>
                  <input
                    type="text"
                    value={poleRight}
                    onChange={(e) => setPoleRight(e.target.value)}
                    placeholder="e.g., Always"
                    className="input-field"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-Choice Options */}
        <AnimatePresence>
          {promptType === 'MULTI_CHOICE' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-5 overflow-hidden"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Selection Mode</label>
                <div className="flex gap-3">
                  {[
                    { value: 'SINGLE_SELECT', label: 'Single Choice' },
                    { value: 'MULTI_SELECT', label: 'Multiple Choices' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setMultiChoiceMode(mode.value as MultiChoiceMode)}
                      className={`
                        flex-1 p-3 rounded-xl text-sm font-medium transition-all
                        ${multiChoiceMode === mode.value
                          ? 'bg-jury-primary/15 border-2 border-jury-primary text-white'
                          : 'bg-jury-surface-light/40 border-2 border-transparent text-gray-300 hover:border-gray-600'
                        }
                      `}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Options <span className="text-gray-500">(2-5)</span>
                </label>
                <div className="space-y-3">
                  {choices.map((choice, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-12 flex items-center justify-center text-gray-500 text-sm font-medium">
                        {index + 1}.
                      </div>
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => handleChoiceChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="input-field flex-1"
                      />
                      {choices.length > 2 && (
                        <button
                          onClick={() => handleRemoveChoice(index)}
                          className="icon-btn flex-shrink-0 text-gray-400 hover:text-jury-disapprove"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {choices.length < 5 && (
                    <button
                      onClick={handleAddChoice}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-jury-primary hover:bg-jury-primary/5 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-jury-primary"
                    >
                      <Plus className="w-5 h-5" />
                      Add Option
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Attachment */}
        <div>
          <AnimatePresence mode="wait">
            {showMediaInput ? (
              <motion.div
                key="media-input"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card-base p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Add Media</label>
                  <button
                    onClick={() => {
                      setShowMediaInput(false)
                      setMediaUrl('')
                    }}
                    className="icon-btn text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  {[
                    { type: 'image', icon: ImageIcon },
                    { type: 'video', icon: Video },
                    { type: 'link', icon: LinkIcon },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.type}
                        onClick={() => setMediaType(item.type as 'image' | 'video' | 'link')}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
                          ${mediaType === item.type
                            ? 'bg-jury-primary/15 border border-jury-primary text-jury-primary'
                            : 'bg-jury-surface-light/50 border border-transparent text-gray-400 hover:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </button>
                    )
                  })}
                </div>

                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </motion.div>
            ) : (
              <motion.button
                key="media-button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowMediaInput(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-600 hover:border-jury-primary hover:bg-jury-primary/5 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-jury-primary"
              >
                <ImageIcon className="w-5 h-5" />
                Add Media (optional)
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!isValid() || createMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2.5 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Create Prompt
            </>
          )}
        </button>

        {createMutation.error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-jury-disapprove text-sm text-center p-3 rounded-xl bg-jury-disapprove/10 border border-jury-disapprove/30"
          >
            {createMutation.error.message}
          </motion.p>
        )}
      </main>
    </div>
  )
}
