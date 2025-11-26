import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get matches where user is either user1 or user2
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true,
            name: true,
            avatarUrl: true,
          },
        },
        user2: {
          select: {
            id: true,
            displayName: true,
            name: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include other user info
    const transformedMatches = await Promise.all(
      matches.map(async (match) => {
        const isUser1 = match.user1Id === session.user.id
        const otherUser = isUser1 ? match.user2 : match.user1
        const lastMessage = match.messages[0]

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            matchId: match.id,
            senderId: { not: session.user.id },
            readAt: null,
          },
        })

        return {
          id: match.id,
          type: match.type,
          score: match.score,
          otherUser: {
            id: otherUser.id,
            displayName: otherUser.displayName || otherUser.name,
            avatarUrl: otherUser.avatarUrl,
          },
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                createdAt: lastMessage.createdAt.toISOString(),
                isFromMe: lastMessage.senderId === session.user.id,
              }
            : null,
          unreadCount,
          createdAt: match.createdAt.toISOString(),
        }
      })
    )

    return NextResponse.json({ matches: transformedMatches })
  } catch (error) {
    console.error('Matches error:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }
}

// Check for potential matches based on voting patterns
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, promptId } = await req.json()

    // Get shared votes between users
    const [userVotes, targetVotes] = await Promise.all([
      prisma.vote.findMany({
        where: { userId: session.user.id, value: { not: null } },
        select: { promptId: true, value: true },
      }),
      prisma.vote.findMany({
        where: { userId: targetUserId, value: { not: null } },
        select: { promptId: true, value: true },
      }),
    ])

    const userVoteMap = new Map(userVotes.map((v) => [v.promptId, v.value]))
    const targetVoteMap = new Map(targetVotes.map((v) => [v.promptId, v.value]))

    // Find shared prompts
    const sharedPromptIds = [...userVoteMap.keys()].filter((id) =>
      targetVoteMap.has(id)
    )

    if (sharedPromptIds.length < 5) {
      return NextResponse.json({
        eligible: false,
        reason: 'Not enough shared votes',
        sharedCount: sharedPromptIds.length,
      })
    }

    // Calculate alignment
    let alignedCount = 0
    let opposedCount = 0

    for (const promptId of sharedPromptIds) {
      const userValue = userVoteMap.get(promptId)!
      const targetValue = targetVoteMap.get(promptId)!

      // Consider aligned if both positive or both negative
      const sameSign = (userValue > 0 && targetValue > 0) || (userValue < 0 && targetValue < 0)
      if (sameSign) {
        alignedCount++
      } else {
        opposedCount++
      }
    }

    const alignmentRatio = alignedCount / sharedPromptIds.length
    const oppositionRatio = opposedCount / sharedPromptIds.length

    // Check if meets threshold (70%)
    const isSimilar = alignmentRatio >= 0.7
    const isOpposite = oppositionRatio >= 0.7

    if (!isSimilar && !isOpposite) {
      return NextResponse.json({
        eligible: false,
        reason: 'Alignment threshold not met',
        alignmentRatio,
        oppositionRatio,
      })
    }

    // Create match if it doesn't exist
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: session.user.id, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: session.user.id },
        ],
      },
    })

    if (existingMatch) {
      return NextResponse.json({
        eligible: true,
        match: existingMatch,
        isNew: false,
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { latitude: true, longitude: true },
    })

    const match = await prisma.match.create({
      data: {
        user1Id: session.user.id,
        user2Id: targetUserId,
        type: isSimilar ? 'SIMILAR' : 'OPPOSITE',
        score: isSimilar ? alignmentRatio : oppositionRatio,
        promptId,
        latitude: user?.latitude,
        longitude: user?.longitude,
      },
    })

    // Update metrics
    await Promise.all([
      prisma.userMetric.upsert({
        where: { userId: session.user.id },
        update: { totalMatches: { increment: 1 }, matchesThisWeek: { increment: 1 } },
        create: { userId: session.user.id, totalMatches: 1, matchesThisWeek: 1 },
      }),
      prisma.userMetric.upsert({
        where: { userId: targetUserId },
        update: { totalMatches: { increment: 1 }, matchesThisWeek: { increment: 1 } },
        create: { userId: targetUserId, totalMatches: 1, matchesThisWeek: 1 },
      }),
    ])

    return NextResponse.json({
      eligible: true,
      match,
      isNew: true,
    })
  } catch (error) {
    console.error('Create match error:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
