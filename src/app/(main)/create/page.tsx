'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { Loader2, Plus, X, Image as ImageIcon, Link as LinkIcon, AlertCircle } from 'lucide-react'

type PromptType = 'STATEMENT' | 'TWO_POLE' | 'MULTI_CHOICE'
type MultiChoiceMode = 'SINGLE_SELECT' | 'MULTI_SELECT'

interface SimilarPrompt {
  id: string
  text: string
  voteCount: number
  score?: number
}

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

  // Debounce search text
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

  // Search for similar prompts
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

  // Create mutation
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
    <div className="min-h-screen">
      <Header title="Create Prompt" showLogo={false} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Prompt Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Prompt Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'STATEMENT', label: 'Statement' },
              { value: 'TWO_POLE', label: 'Spectrum' },
              { value: 'MULTI_CHOICE', label: 'Multi-Choice' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setPromptType(type.value as PromptType)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  promptType === type.value
                    ? 'bg-jury-primary text-white'
                    : 'bg-jury-surface hover:bg-jury-surface-light'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Text */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {promptType === 'STATEMENT' ? 'Statement' : 'Question'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              promptType === 'STATEMENT'
                ? 'e.g., "Pineapple belongs on pizza"'
                : 'e.g., "How do you prefer to work?"'
            }
            className="input-field h-24 resize-none"
          />

          {/* Similar Prompts Suggestions */}
          {similarPrompts && similarPrompts.prompts.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-jury-surface border border-jury-surface-light">
              <div className="flex items-center gap-2 text-yellow-500 text-sm mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>Similar prompts exist:</span>
              </div>
              <ul className="space-y-2">
                {similarPrompts.prompts.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => handleExistingPrompt(p.id)}
                      className="text-left text-sm text-gray-300 hover:text-white w-full p-2 rounded hover:bg-jury-surface-light transition-colors"
                    >
                      {p.text}
                      <span className="text-gray-500 ml-2">({p.voteCount} votes)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Two-Pole Options */}
        {promptType === 'TWO_POLE' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Left Pole</label>
              <input
                type="text"
                value={poleLeft}
                onChange={(e) => setPoleLeft(e.target.value)}
                placeholder="e.g., Never"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Right Pole</label>
              <input
                type="text"
                value={poleRight}
                onChange={(e) => setPoleRight(e.target.value)}
                placeholder="e.g., Always"
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* Multi-Choice Options */}
        {promptType === 'MULTI_CHOICE' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Selection Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMultiChoiceMode('SINGLE_SELECT')}
                  className={`flex-1 p-2 rounded-lg text-sm transition-colors ${
                    multiChoiceMode === 'SINGLE_SELECT'
                      ? 'bg-jury-primary text-white'
                      : 'bg-jury-surface hover:bg-jury-surface-light'
                  }`}
                >
                  Single Select
                </button>
                <button
                  onClick={() => setMultiChoiceMode('MULTI_SELECT')}
                  className={`flex-1 p-2 rounded-lg text-sm transition-colors ${
                    multiChoiceMode === 'MULTI_SELECT'
                      ? 'bg-jury-primary text-white'
                      : 'bg-jury-surface hover:bg-jury-surface-light'
                  }`}
                >
                  Multi Select
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Choices (2-5)</label>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <div key={index} className="flex gap-2">
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
                        className="p-3 rounded-lg bg-jury-surface hover:bg-jury-surface-light transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {choices.length < 5 && (
                  <button
                    onClick={handleAddChoice}
                    className="w-full p-3 rounded-lg border-2 border-dashed border-jury-surface-light hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Media Attachment */}
        <div>
          {showMediaInput ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Media URL</label>
                <button
                  onClick={() => {
                    setShowMediaInput(false)
                    setMediaUrl('')
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                {['image', 'video', 'link'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type as 'image' | 'video' | 'link')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      mediaType === type
                        ? 'bg-jury-primary text-white'
                        : 'bg-jury-surface hover:bg-jury-surface-light'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="input-field"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowMediaInput(true)}
              className="w-full p-3 rounded-lg border-2 border-dashed border-jury-surface-light hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-gray-400"
            >
              <ImageIcon className="w-4 h-4" />
              Add Media (optional)
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!isValid() || createMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Create Prompt'
          )}
        </button>

        {createMutation.error && (
          <p className="text-jury-disapprove text-sm text-center">
            {createMutation.error.message}
          </p>
        )}
      </main>
    </div>
  )
}
