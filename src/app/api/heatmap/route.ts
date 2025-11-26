import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to calculate distance between two points in miles
function getDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '20')
    const promptId = searchParams.get('promptId')

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Location required' }, { status: 400 })
    }

    // Calculate bounding box for initial filter (rough approximation)
    const latDelta = radius / 69 // ~69 miles per degree of latitude
    const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180))

    // Get votes within the bounding box
    const whereClause: Record<string, unknown> = {
      latitude: {
        gte: lat - latDelta,
        lte: lat + latDelta,
      },
      longitude: {
        gte: lng - lngDelta,
        lte: lng + lngDelta,
      },
      value: { not: null },
    }

    if (promptId) {
      whereClause.promptId = promptId
    }

    const votes = await prisma.vote.findMany({
      where: whereClause,
      select: {
        latitude: true,
        longitude: true,
        value: true,
        userId: true,
      },
    })

    // Filter by actual distance and aggregate by grid cell
    const gridSize = 0.01 // ~0.7 miles per grid cell
    const gridCells = new Map<
      string,
      { lat: number; lng: number; values: number[]; userIds: Set<string> }
    >()

    for (const vote of votes) {
      if (!vote.latitude || !vote.longitude) continue

      const distance = getDistanceMiles(lat, lng, vote.latitude, vote.longitude)
      if (distance > radius) continue

      // Round to grid cell
      const gridLat = Math.round(vote.latitude / gridSize) * gridSize
      const gridLng = Math.round(vote.longitude / gridSize) * gridSize
      const key = `${gridLat},${gridLng}`

      if (!gridCells.has(key)) {
        gridCells.set(key, { lat: gridLat, lng: gridLng, values: [], userIds: new Set() })
      }

      const cell = gridCells.get(key)!
      cell.values.push(vote.value!)
      cell.userIds.add(vote.userId)
    }

    // Convert to heatmap points
    const points = Array.from(gridCells.values()).map((cell) => {
      const avgValue =
        cell.values.reduce((sum, v) => sum + v, 0) / cell.values.length

      return {
        latitude: cell.lat,
        longitude: cell.lng,
        value: avgValue,
        density: cell.values.length,
      }
    })

    // Get user's own votes to calculate alignment
    const userVotes = await prisma.vote.findMany({
      where: {
        userId: session.user.id,
        value: { not: null },
      },
      select: {
        promptId: true,
        value: true,
      },
    })

    const userVoteMap = new Map(userVotes.map((v) => [v.promptId, v.value]))

    // Calculate alignment with neighborhood
    const neighborhoodVotes = await prisma.vote.findMany({
      where: {
        ...whereClause,
        userId: { not: session.user.id },
      },
      select: {
        promptId: true,
        value: true,
      },
    })

    // Group neighborhood votes by prompt
    const neighborhoodByPrompt = new Map<string, number[]>()
    for (const vote of neighborhoodVotes) {
      if (!neighborhoodByPrompt.has(vote.promptId)) {
        neighborhoodByPrompt.set(vote.promptId, [])
      }
      neighborhoodByPrompt.get(vote.promptId)!.push(vote.value!)
    }

    // Calculate average alignment
    let alignmentSum = 0
    let alignmentCount = 0

    for (const [promptId, neighborValues] of neighborhoodByPrompt) {
      const userValue = userVoteMap.get(promptId)
      if (userValue === undefined || userValue === null) continue

      const neighborAvg =
        neighborValues.reduce((sum, v) => sum + v, 0) / neighborValues.length
      // Alignment is 1 - |difference|/2 (normalized to 0-1)
      const alignment = 1 - Math.abs(userValue - neighborAvg) / 2
      alignmentSum += alignment
      alignmentCount++
    }

    const avgAlignment = alignmentCount > 0 ? alignmentSum / alignmentCount : 0.5

    // Count unique users
    const uniqueUserIds = new Set<string>()
    for (const cell of gridCells.values()) {
      for (const userId of cell.userIds) {
        uniqueUserIds.add(userId)
      }
    }

    return NextResponse.json({
      points,
      stats: {
        totalVotes: votes.length,
        avgAlignment,
        userCount: uniqueUserIds.size,
      },
    })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json({ error: 'Failed to fetch heatmap' }, { status: 500 })
  }
}
