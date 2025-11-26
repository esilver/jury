import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const onboardingSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  votes: z.record(z.number()),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = onboardingSchema.parse(body)

    // Update user location and onboarding status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        locationUpdatedAt: data.latitude ? new Date() : undefined,
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    })

    // Create votes for onboarding prompts
    // Note: In production, these prompt IDs would be real database IDs
    // For now, we'll create the prompts if they don't exist
    const onboardingPrompts = [
      { id: 'onboard-1', text: 'Pineapple belongs on pizza' },
      { id: 'onboard-2', text: 'Dogs are better than cats' },
      { id: 'onboard-3', text: 'Working from home is better than office' },
      { id: 'onboard-4', text: 'Social media has more benefits than drawbacks' },
      { id: 'onboard-5', text: 'Early mornings are better than late nights' },
    ]

    for (const prompt of onboardingPrompts) {
      const voteValue = data.votes[prompt.id]
      if (voteValue === undefined) continue

      // Get or create the prompt
      let dbPrompt = await prisma.prompt.findFirst({
        where: { textLower: prompt.text.toLowerCase() },
      })

      if (!dbPrompt) {
        dbPrompt = await prisma.prompt.create({
          data: {
            text: prompt.text,
            textLower: prompt.text.toLowerCase(),
            type: 'STATEMENT',
            creatorId: session.user.id,
            isPublic: true,
          },
        })
      }

      // Create vote
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await prisma.vote.upsert({
        where: {
          userId_promptId: {
            userId: session.user.id,
            promptId: dbPrompt.id,
          },
        },
        update: {
          value: voteValue,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        create: {
          userId: session.user.id,
          promptId: dbPrompt.id,
          value: voteValue,
          version: 1,
          canReviseAt: tomorrow,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      })

      // Update prompt vote count
      await prisma.prompt.update({
        where: { id: dbPrompt.id },
        data: { voteCount: { increment: 1 } },
      })
    }

    // Initialize user metrics
    const voteCount = Object.keys(data.votes).length
    await prisma.userMetric.upsert({
      where: { userId: session.user.id },
      update: {
        votesThisWeek: { increment: voteCount },
        totalVotes: { increment: voteCount },
      },
      create: {
        userId: session.user.id,
        votesThisWeek: voteCount,
        totalVotes: voteCount,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
