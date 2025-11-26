import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createCommentSchema = z.object({
  promptId: z.string(),
  text: z.string().min(1).max(1000),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createCommentSchema.parse(body)

    // Check if user has voted on this prompt
    const vote = await prisma.vote.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: data.promptId,
        },
      },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'You must vote on a prompt before commenting' },
        { status: 403 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        promptId: data.promptId,
        userId: session.user.id,
        text: data.text,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }

    // Check if user has voted
    const vote = await prisma.vote.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId,
        },
      },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'You must vote to view comments' },
        { status: 403 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: { promptId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          where: { userId: session.user.id },
          select: { value: true },
        },
      },
      orderBy: [
        { approveCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        text: c.text,
        user: {
          id: c.user.id,
          displayName: c.user.displayName || c.user.name,
          avatarUrl: c.user.avatarUrl,
        },
        approveCount: c.approveCount,
        disapproveCount: c.disapproveCount,
        userReaction: c.reactions[0]?.value ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
