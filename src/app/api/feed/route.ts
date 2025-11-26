import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sortBy = searchParams.get('sortBy') || 'trending'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const radius = searchParams.get('radius')

    // Get user's existing votes to exclude
    const userVotes = await prisma.vote.findMany({
      where: { userId: session.user.id },
      select: { promptId: true, value: true, choices: { select: { choiceId: true } } },
    })

    const votedPromptIds = userVotes.map((v) => v.promptId)
    const userVoteMap = new Map(
      userVotes.map((v) => [
        v.promptId,
        { value: v.value, choiceIds: v.choices.map((c) => c.choiceId) },
      ])
    )

    // Build order clause based on sortBy
    let orderBy: Record<string, unknown>[] = []
    switch (sortBy) {
      case 'trending':
        orderBy = [{ trendingScore: 'desc' }, { voteCount: 'desc' }, { createdAt: 'desc' }]
        break
      case 'newest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'distance':
        // For distance-based sorting, we'd need PostGIS or similar
        // For now, fall back to trending
        orderBy = [{ trendingScore: 'desc' }]
        break
      default:
        orderBy = [{ trendingScore: 'desc' }]
    }

    // Fetch prompts
    const prompts = await prisma.prompt.findMany({
      where: {
        isPublic: true,
      },
      include: {
        choices: {
          orderBy: { order: 'asc' },
        },
        mediaAttachments: true,
        _count: {
          select: { votes: true, comments: true },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    })

    // Calculate stats for each prompt
    const promptsWithStats = await Promise.all(
      prompts.map(async (prompt) => {
        // Get vote distribution for bipolar prompts
        let approvePercent = 50
        let disapprovePercent = 50

        if (prompt.type === 'STATEMENT' || prompt.type === 'TWO_POLE') {
          const votes = await prisma.vote.findMany({
            where: { promptId: prompt.id, value: { not: null } },
            select: { value: true },
          })

          if (votes.length > 0) {
            const approveCount = votes.filter((v) => (v.value ?? 0) > 0).length
            approvePercent = Math.round((approveCount / votes.length) * 100)
            disapprovePercent = 100 - approvePercent
          }
        }

        // Get user's vote for this prompt
        const userVote = userVoteMap.get(prompt.id)

        return {
          id: prompt.id,
          text: prompt.text,
          type: prompt.type,
          poleLeft: prompt.poleLeft,
          poleRight: prompt.poleRight,
          multiChoiceMode: prompt.multiChoiceMode,
          choices: prompt.choices.map((c) => ({
            id: c.id,
            text: c.text,
            order: c.order,
          })),
          mediaAttachments: prompt.mediaAttachments.map((m) => ({
            id: m.id,
            type: m.type,
            url: m.url,
            thumbnailUrl: m.thumbnailUrl,
          })),
          creatorId: prompt.creatorId,
          voteCount: prompt._count.votes,
          createdAt: prompt.createdAt,
          approvePercent,
          disapprovePercent,
          userVote,
        }
      })
    )

    return NextResponse.json({ prompts: promptsWithStats })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
