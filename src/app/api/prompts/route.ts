import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import Fuse from 'fuse.js'

const createPromptSchema = z.object({
  text: z.string().min(1, 'Prompt text is required'),
  type: z.enum(['STATEMENT', 'TWO_POLE', 'MULTI_CHOICE']).default('STATEMENT'),
  poleLeft: z.string().optional(),
  poleRight: z.string().optional(),
  multiChoiceMode: z.enum(['SINGLE_SELECT', 'MULTI_SELECT']).optional(),
  choices: z.array(z.string()).optional(),
  mediaUrls: z.array(z.object({
    type: z.enum(['image', 'video', 'link']),
    url: z.string().url(),
  })).optional(),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createPromptSchema.parse(body)

    // Validate type-specific fields
    if (data.type === 'TWO_POLE') {
      if (!data.poleLeft || !data.poleRight) {
        return NextResponse.json(
          { error: 'Two-pole prompts require both pole labels' },
          { status: 400 }
        )
      }
    }

    if (data.type === 'MULTI_CHOICE') {
      if (!data.choices || data.choices.length < 2) {
        return NextResponse.json(
          { error: 'Multi-choice prompts require at least 2 choices' },
          { status: 400 }
        )
      }
      if (data.choices.length > 5) {
        return NextResponse.json(
          { error: 'Multi-choice prompts can have at most 5 choices' },
          { status: 400 }
        )
      }
    }

    // Create prompt
    const prompt = await prisma.prompt.create({
      data: {
        text: data.text,
        textLower: data.text.toLowerCase(),
        type: data.type,
        poleLeft: data.poleLeft,
        poleRight: data.poleRight,
        multiChoiceMode: data.multiChoiceMode,
        creatorId: session.user.id,
        isPublic: true,
        choices:
          data.choices && data.choices.length > 0
            ? {
                create: data.choices.map((text, index) => ({
                  text,
                  order: index,
                })),
              }
            : undefined,
        mediaAttachments:
          data.mediaUrls && data.mediaUrls.length > 0
            ? {
                create: data.mediaUrls.map((media) => ({
                  type: media.type,
                  url: media.url,
                })),
              }
            : undefined,
      },
      include: {
        choices: true,
        mediaAttachments: true,
      },
    })

    // Update user metrics
    await prisma.userMetric.upsert({
      where: { userId: session.user.id },
      update: {
        promptsThisWeek: { increment: 1 },
        totalPrompts: { increment: 1 },
      },
      create: {
        userId: session.user.id,
        promptsThisWeek: 1,
        totalPrompts: 1,
      },
    })

    return NextResponse.json({ prompt })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Create prompt error:', error)
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (search) {
      // Fuzzy search for similar prompts
      const allPrompts = await prisma.prompt.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          text: true,
          textLower: true,
          type: true,
          voteCount: true,
        },
        orderBy: { voteCount: 'desc' },
        take: 500, // Limit for performance
      })

      const fuse = new Fuse(allPrompts, {
        keys: ['textLower'],
        threshold: 0.4,
        includeScore: true,
      })

      const results = fuse.search(search.toLowerCase())

      return NextResponse.json({
        prompts: results.slice(0, limit).map((r) => ({
          ...r.item,
          score: r.score,
        })),
      })
    }

    // Get recent prompts
    const prompts = await prisma.prompt.findMany({
      where: { isPublic: true },
      include: {
        choices: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      prompts: prompts.map((p) => ({
        id: p.id,
        text: p.text,
        type: p.type,
        choices: p.choices,
        voteCount: p._count.votes,
        createdAt: p.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get prompts error:', error)
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}
