import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        choices: {
          orderBy: { order: 'asc' },
        },
        mediaAttachments: true,
        _count: {
          select: { votes: true, comments: true },
        },
      },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Get vote distribution
    let approvePercent = 50
    let disapprovePercent = 50

    if (prompt.type === 'STATEMENT' || prompt.type === 'TWO_POLE') {
      const votes = await prisma.vote.findMany({
        where: { promptId: id, value: { not: null } },
        select: { value: true },
      })

      if (votes.length > 0) {
        const approveCount = votes.filter((v) => (v.value ?? 0) > 0).length
        approvePercent = Math.round((approveCount / votes.length) * 100)
        disapprovePercent = 100 - approvePercent
      }
    }

    // Get user's vote
    const userVote = await prisma.vote.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: id,
        },
      },
      include: {
        choices: true,
      },
    })

    return NextResponse.json({
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
      voteCount: prompt._count.votes,
      commentCount: prompt._count.comments,
      approvePercent,
      disapprovePercent,
      userVote: userVote
        ? {
            value: userVote.value,
            choiceIds: userVote.choices.map((c) => c.choiceId),
          }
        : null,
      createdAt: prompt.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Get prompt error:', error)
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 })
  }
}
