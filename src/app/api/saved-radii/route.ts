import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createRadiusSchema = z.object({
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  radiusMiles: z.number().min(1).max(500),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createRadiusSchema.parse(body)

    const savedRadius = await prisma.savedRadius.create({
      data: {
        userId: session.user.id,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMiles: data.radiusMiles,
      },
    })

    return NextResponse.json({ savedRadius })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    console.error('Save radius error:', error)
    return NextResponse.json({ error: 'Failed to save radius' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const radii = await prisma.savedRadius.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ radii })
  } catch (error) {
    console.error('Get radii error:', error)
    return NextResponse.json({ error: 'Failed to fetch saved radii' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Radius ID required' }, { status: 400 })
    }

    await prisma.savedRadius.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete radius error:', error)
    return NextResponse.json({ error: 'Failed to delete radius' }, { status: 500 })
  }
}
