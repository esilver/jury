'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2, ChevronRight, Scale, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useLocation } from '@/contexts/LocationContext'

interface InitialPrompt {
  id: string
  text: string
}

// Initial prompts for onboarding (will be fetched from API in production)
const ONBOARDING_PROMPTS: InitialPrompt[] = [
  { id: 'onboard-1', text: 'Pineapple belongs on pizza' },
  { id: 'onboard-2', text: 'Dogs are better than cats' },
  { id: 'onboard-3', text: 'Working from home is better than office' },
  { id: 'onboard-4', text: 'Social media has more benefits than drawbacks' },
  { id: 'onboard-5', text: 'Early mornings are better than late nights' },
]

type OnboardingStep = 'welcome' | 'location' | 'prompts' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { requestLocation, latitude, longitude, error: locationError, loading: locationLoading, granted } = useLocation()

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const handleLocationRequest = async () => {
    const success = await requestLocation()
    if (success) {
      setStep('prompts')
    }
  }

  const handleVote = async (value: number) => {
    const prompt = ONBOARDING_PROMPTS[currentPromptIndex]
    setVotes((prev) => ({ ...prev, [prompt.id]: value }))

    if (currentPromptIndex < ONBOARDING_PROMPTS.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1)
    } else {
      setStep('complete')
    }
  }

  const handleComplete = async () => {
    setSubmitting(true)

    try {
      // Submit onboarding data to API
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          votes,
        }),
      })

      router.push('/feed')
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-jury-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-2 mb-8">
              <Scale className="w-12 h-12 text-jury-primary" />
              <h1 className="text-4xl font-bold">Jury</h1>
            </div>

            <h2 className="text-2xl font-semibold">Welcome{session?.user?.name ? `, ${session.user.name}` : ''}!</h2>

            <p className="text-gray-400">
              Let&apos;s set you up to discover people who share your views (or delightfully disagree).
            </p>

            <div className="space-y-4 text-left card-base p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-jury-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-jury-primary font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Share your location</p>
                  <p className="text-sm text-gray-400">Find people nearby with similar opinions</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-jury-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-jury-primary font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Answer 5 quick prompts</p>
                  <p className="text-sm text-gray-400">Help us understand your perspectives</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-jury-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-jury-primary font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Start connecting</p>
                  <p className="text-sm text-gray-400">Get matched with your &quot;Good Company&quot;</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('location')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Get Started
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Location Step */}
        {step === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-jury-primary/20 flex items-center justify-center mx-auto">
              <MapPin className="w-10 h-10 text-jury-primary" />
            </div>

            <h2 className="text-2xl font-semibold">Enable Location</h2>

            <p className="text-gray-400">
              Jury uses your location to show you opinions from people nearby and help you find your community.
            </p>

            <div className="card-base p-4 text-sm text-gray-400">
              <p>Your exact location is never shared. We round your position to protect your privacy.</p>
            </div>

            {locationError && (
              <div className="text-jury-disapprove text-sm">
                {locationError}. You can still continue, but location features will be limited.
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleLocationRequest}
                disabled={locationLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : granted ? (
                  <>
                    Location Enabled
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  'Enable Location'
                )}
              </button>

              {!granted && (
                <button
                  onClick={() => setStep('prompts')}
                  className="w-full text-gray-400 hover:text-white text-sm"
                >
                  Skip for now
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Prompts Step */}
        {step === 'prompts' && (
          <motion.div
            key="prompts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            {/* Progress */}
            <div className="flex gap-2">
              {ONBOARDING_PROMPTS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index < currentPromptIndex
                      ? 'bg-jury-approve'
                      : index === currentPromptIndex
                      ? 'bg-jury-primary'
                      : 'bg-jury-surface-light'
                  }`}
                />
              ))}
            </div>

            <p className="text-center text-gray-400 text-sm">
              Prompt {currentPromptIndex + 1} of {ONBOARDING_PROMPTS.length}
            </p>

            {/* Prompt Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPromptIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card-base p-8"
              >
                <p className="text-xl font-medium text-center">
                  {ONBOARDING_PROMPTS[currentPromptIndex].text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Vote Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleVote(-1)}
                className="btn-disapprove flex-1 flex items-center justify-center gap-2"
              >
                <ThumbsDown className="w-5 h-5" />
                Disagree
              </button>
              <button
                onClick={() => handleVote(1)}
                className="btn-approve flex-1 flex items-center justify-center gap-2"
              >
                <ThumbsUp className="w-5 h-5" />
                Agree
              </button>
            </div>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-jury-approve/20 flex items-center justify-center mx-auto">
              <Scale className="w-10 h-10 text-jury-approve" />
            </div>

            <h2 className="text-2xl font-semibold">You&apos;re all set!</h2>

            <p className="text-gray-400">
              You answered {Object.keys(votes).length} prompts. Now let&apos;s find your Good Company.
            </p>

            <button
              onClick={handleComplete}
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Enter the Jury
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
