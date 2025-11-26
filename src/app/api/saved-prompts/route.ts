import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { promptId } = await req.json()

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }

    // Check if already saved
    const existing = await prisma.savedPrompt.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ saved: existing, alreadySaved: true })
    }

    // Save prompt
    const saved = await prisma.savedPrompt.create({
      data: {
        userId: session.user.id,
        promptId,
      },
    })

    // Update metrics
    await prisma.userMetric.upsert({
      where: { userId: session.user.id },
      update: { totalQueueSaves: { increment: 1 } },
      create: { userId: session.user.id, totalQueueSaves: 1 },
    })

    return NextResponse.json({ saved })
  } catch (error) {
    console.error('Save prompt error:', error)
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saved = await prisma.savedPrompt.findMany({
      where: { userId: session.user.id },
      include: {
        prompt: {
          include: {
            choices: true,
            mediaAttachments: true,
            _count: { select: { votes: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      prompts: saved.map((s) => ({
        savedAt: s.createdAt,
        prompt: {
          id: s.prompt.id,
          text: s.prompt.text,
          type: s.prompt.type,
          choices: s.prompt.choices,
          mediaAttachments: s.prompt.mediaAttachments,
          voteCount: s.prompt._count.votes,
        },
      })),
    })
  } catch (error) {
    console.error('Get saved prompts error:', error)
    return NextResponse.json({ error: 'Failed to fetch saved prompts' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const promptId = searchParams.get('promptId')

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }

    await prisma.savedPrompt.delete({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete saved prompt error:', error)
    return NextResponse.json({ error: 'Failed to remove saved prompt' }, { status: 500 })
  }
}
