import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const voteSchema = z.object({
  promptId: z.string(),
  value: z.number().min(-1).max(1).optional(),
  choiceIds: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = voteSchema.parse(body)

    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: data.promptId },
      include: { choices: true },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Check for existing vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: data.promptId,
        },
      },
      include: { choices: true },
    })

    if (existingVote) {
      // Check if user can revise (once per day unless premium)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isPremium: true },
      })

      if (!user?.isPremium && existingVote.canReviseAt && existingVote.canReviseAt > new Date()) {
        return NextResponse.json(
          { error: 'You can only revise your vote once per day' },
          { status: 429 }
        )
      }

      // Create version history
      await prisma.voteVersion.create({
        data: {
          voteId: existingVote.id,
          userId: session.user.id,
          promptId: data.promptId,
          version: existingVote.version,
          value: existingVote.value,
          choiceIds: existingVote.choices.map((c) => c.choiceId),
        },
      })

      // Update vote
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Delete existing choices
      await prisma.voteChoice.deleteMany({
        where: { voteId: existingVote.id },
      })

      const updatedVote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: {
          value: data.value,
          version: existingVote.version + 1,
          lastRevisedAt: new Date(),
          canReviseAt: tomorrow,
          latitude: data.latitude,
          longitude: data.longitude,
          choices:
            data.choiceIds && data.choiceIds.length > 0
              ? {
                  create: data.choiceIds.map((choiceId) => ({ choiceId })),
                }
              : undefined,
        },
        include: { choices: true },
      })

      return NextResponse.json({ vote: updatedVote, isRevision: true })
    }

    // Create new vote
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const vote = await prisma.vote.create({
      data: {
        userId: session.user.id,
        promptId: data.promptId,
        value: data.value,
        version: 1,
        canReviseAt: tomorrow,
        latitude: data.latitude,
        longitude: data.longitude,
        choices:
          data.choiceIds && data.choiceIds.length > 0
            ? {
                create: data.choiceIds.map((choiceId) => ({ choiceId })),
              }
            : undefined,
      },
      include: { choices: true },
    })

    // Update prompt vote count and trending score
    await prisma.prompt.update({
      where: { id: data.promptId },
      data: {
        voteCount: { increment: 1 },
        trendingScore: { increment: 1 },
      },
    })

    // Update user metrics
    await prisma.userMetric.upsert({
      where: { userId: session.user.id },
      update: {
        votesThisWeek: { increment: 1 },
        totalVotes: { increment: 1 },
      },
      create: {
        userId: session.user.id,
        votesThisWeek: 1,
        totalVotes: 1,
      },
    })

    // Get vote stats for response
    const votes = await prisma.vote.findMany({
      where: { promptId: data.promptId, value: { not: null } },
      select: { value: true },
    })

    const approveCount = votes.filter((v) => (v.value ?? 0) > 0).length
    const approvePercent = votes.length > 0 ? Math.round((approveCount / votes.length) * 100) : 50
    const disapprovePercent = 100 - approvePercent

    return NextResponse.json({
      vote,
      isRevision: false,
      stats: {
        approvePercent,
        disapprovePercent,
        totalVotes: votes.length,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const promptId = searchParams.get('promptId')

    if (promptId) {
      // Get single vote
      const vote = await prisma.vote.findUnique({
        where: {
          userId_promptId: {
            userId: session.user.id,
            promptId,
          },
        },
        include: {
          choices: true,
          versions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      return NextResponse.json({ vote })
    }

    // Get all user votes
    const votes = await prisma.vote.findMany({
      where: { userId: session.user.id },
      include: {
        prompt: {
          select: {
            id: true,
            text: true,
            type: true,
          },
        },
        choices: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ votes })
  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
  }
}
