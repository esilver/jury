import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const flagSchema = z.object({
  type: z.enum(['PROMPT', 'COMMENT', 'USER']),
  promptId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = flagSchema.parse(body)

    // Validate required IDs based on type
    if (data.type === 'PROMPT' && !data.promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }
    if (data.type === 'COMMENT' && !data.commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Check if already flagged by this user
    const existing = await prisma.flag.findFirst({
      where: {
        reporterId: session.user.id,
        promptId: data.promptId,
        commentId: data.commentId,
        type: data.type,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already flagged this content' },
        { status: 400 }
      )
    }

    const flag = await prisma.flag.create({
      data: {
        type: data.type,
        reporterId: session.user.id,
        promptId: data.promptId,
        commentId: data.commentId,
        reason: data.reason,
        status: 'PENDING',
      },
    })

    // Check if threshold met for auto-escalation (e.g., 5 flags)
    const flagCount = await prisma.flag.count({
      where: {
        promptId: data.promptId,
        commentId: data.commentId,
        type: data.type,
        status: 'PENDING',
      },
    })

    // Could add auto-moderation logic here
    // For now, just log if threshold is reached
    if (flagCount >= 5) {
      console.log(`Content reached flag threshold: ${data.type} ${data.promptId || data.commentId}`)
    }

    return NextResponse.json({ flag, flagCount })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Flag error:', error)
    return NextResponse.json({ error: 'Failed to flag content' }, { status: 500 })
  }
}
