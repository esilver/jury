'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Loader2, ChevronRight, Scale, ThumbsUp, ThumbsDown, Sparkles, Users, Check, Navigation } from 'lucide-react'
import { useLocation } from '@/contexts/LocationContext'

interface InitialPrompt {
  id: string
  text: string
}

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
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-jury-primary" />
        <p className="mt-4 text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-jury-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-jury-secondary/10 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-8 relative z-10"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-jury-primary to-jury-secondary rounded-2xl blur-xl opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-jury-primary to-jury-secondary rounded-2xl">
                  <Scale className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-5xl font-bold">
                <span className="text-gradient-primary">Jury</span>
              </h1>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome{session?.user?.name ? `, ${session.user.name}` : ''}!
              </h2>
              <p className="text-gray-400">
                Let&apos;s set you up to discover people who share your views.
              </p>
            </div>

            <div className="card-base p-6 space-y-5 text-left">
              {[
                { num: 1, title: 'Share your location', desc: 'Find people nearby with similar opinions', icon: MapPin },
                { num: 2, title: 'Answer 5 quick prompts', desc: 'Help us understand your perspectives', icon: Sparkles },
                { num: 3, title: 'Start connecting', desc: 'Get matched with your "Good Company"', icon: Users },
              ].map((item, index) => (
                <motion.div
                  key={item.num}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jury-primary/20 to-jury-secondary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-jury-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setStep('location')}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Get Started
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}

        {/* Location Step */}
        {step === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-8 relative z-10"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-jury-primary/20 to-jury-secondary/20 flex items-center justify-center mx-auto">
              <MapPin className="w-12 h-12 text-jury-primary animate-float" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Enable Location</h2>
              <p className="text-gray-400">
                Jury uses your location to show you opinions from people nearby.
              </p>
            </div>

            <div className="card-base p-4 flex items-start gap-3 text-left">
              <Check className="w-5 h-5 text-jury-approve mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-400">
                Your exact location is never shared. We round your position to protect your privacy.
              </p>
            </div>

            {locationError && (
              <div className="p-3 rounded-xl bg-jury-disapprove/10 border border-jury-disapprove/30 text-jury-disapprove text-sm">
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : granted ? (
                  <>
                    <Check className="w-5 h-5" />
                    Location Enabled
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Enable Location
                  </>
                )}
              </button>

              {!granted && (
                <button
                  onClick={() => setStep('prompts')}
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
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
            className="w-full max-w-md space-y-6 relative z-10"
          >
            {/* Progress */}
            <div className="flex gap-2">
              {ONBOARDING_PROMPTS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    index < currentPromptIndex
                      ? 'bg-gradient-to-r from-jury-approve to-jury-approve-light'
                      : index === currentPromptIndex
                      ? 'bg-jury-primary animate-pulse'
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
                initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="card-base p-10"
              >
                <p className="text-2xl font-semibold text-center text-white leading-relaxed">
                  {ONBOARDING_PROMPTS[currentPromptIndex].text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Vote Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleVote(-1)}
                className="btn-disapprove flex-1 flex items-center justify-center gap-2.5 py-4"
              >
                <ThumbsDown className="w-6 h-6" />
                Disagree
              </button>
              <button
                onClick={() => handleVote(1)}
                className="btn-approve flex-1 flex items-center justify-center gap-2.5 py-4"
              >
                <ThumbsUp className="w-6 h-6" />
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
            className="w-full max-w-md text-center space-y-8 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-jury-approve/20 to-jury-approve-light/20 flex items-center justify-center mx-auto"
            >
              <Check className="w-12 h-12 text-jury-approve" />
            </motion.div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h2>
              <p className="text-gray-400">
                You answered {Object.keys(votes).length} prompts. Now let&apos;s find your Good Company.
              </p>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={handleComplete}
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Enter the Jury
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
