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

    // Get user metrics
    const metrics = await prisma.userMetric.findUnique({
      where: { userId: session.user.id },
    })

    // Get vote distribution
    const votes = await prisma.vote.findMany({
      where: {
        userId: session.user.id,
        value: { not: null },
      },
      select: { value: true },
    })

    const approveCount = votes.filter((v) => (v.value ?? 0) > 0).length
    const disapproveCount = votes.filter((v) => (v.value ?? 0) < 0).length
    const total = votes.length || 1

    return NextResponse.json({
      totalVotes: metrics?.totalVotes || votes.length,
      totalPrompts: metrics?.totalPrompts || 0,
      approveRatio: approveCount / total,
      disapproveRatio: disapproveCount / total,
      votesThisWeek: metrics?.votesThisWeek || 0,
      totalMatches: metrics?.totalMatches || 0,
    })
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
