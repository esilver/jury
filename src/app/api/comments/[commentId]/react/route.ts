import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const reactionSchema = z.object({
  value: z.number().refine((v) => v === 1 || v === -1, {
    message: 'Value must be 1 (approve) or -1 (disapprove)',
  }),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = await params
    const body = await req.json()
    const { value } = reactionSchema.parse(body)

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, promptId: true },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user has voted on the prompt
    const vote = await prisma.vote.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: comment.promptId,
        },
      },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'You must vote on the prompt before reacting to comments' },
        { status: 403 }
      )
    }

    // Check for existing reaction
    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: session.user.id,
        },
      },
    })

    if (existing) {
      if (existing.value === value) {
        // Same reaction - remove it
        await prisma.commentReaction.delete({
          where: { id: existing.id },
        })

        // Update counts
        await prisma.comment.update({
          where: { id: commentId },
          data: {
            approveCount: value === 1 ? { decrement: 1 } : undefined,
            disapproveCount: value === -1 ? { decrement: 1 } : undefined,
          },
        })

        return NextResponse.json({ reaction: null, removed: true })
      } else {
        // Different reaction - update it
        await prisma.commentReaction.update({
          where: { id: existing.id },
          data: { value },
        })

        // Update counts
        await prisma.comment.update({
          where: { id: commentId },
          data: {
            approveCount: value === 1 ? { increment: 1 } : { decrement: 1 },
            disapproveCount: value === -1 ? { increment: 1 } : { decrement: 1 },
          },
        })

        return NextResponse.json({ reaction: value, changed: true })
      }
    }

    // Create new reaction
    await prisma.commentReaction.create({
      data: {
        commentId,
        userId: session.user.id,
        value,
      },
    })

    // Update counts
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        approveCount: value === 1 ? { increment: 1 } : undefined,
        disapproveCount: value === -1 ? { increment: 1 } : undefined,
      },
    })

    return NextResponse.json({ reaction: value, created: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Comment reaction error:', error)
    return NextResponse.json({ error: 'Failed to react to comment' }, { status: 500 })
  }
}
