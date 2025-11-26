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

    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '20')

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Location required' }, { status: 400 })
    }

    // Calculate bounding box for initial filter
    const latDelta = radius / 69
    const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180))

    // Get users within the radius who have location set
    const usersInArea = await prisma.user.findMany({
      where: {
        latitude: {
          gte: lat - latDelta,
          lte: lat + latDelta,
        },
        longitude: {
          gte: lng - lngDelta,
          lte: lng + lngDelta,
        },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
    })

    // Filter by actual distance
    const usersWithinRadius = usersInArea.filter((user) => {
      if (!user.latitude || !user.longitude) return false
      const distance = getDistanceMiles(lat, lng, user.latitude, user.longitude)
      return distance <= radius
    })

    // Generate heatmap points based on user locations
    const gridSize = 0.01 // ~0.7 miles per grid cell
    const gridCells = new Map<
      string,
      { lat: number; lng: number; userIds: Set<string> }
    >()

    for (const user of usersWithinRadius) {
      if (!user.latitude || !user.longitude) continue

      const gridLat = Math.round(user.latitude / gridSize) * gridSize
      const gridLng = Math.round(user.longitude / gridSize) * gridSize
      const key = `${gridLat},${gridLng}`

      if (!gridCells.has(key)) {
        gridCells.set(key, { lat: gridLat, lng: gridLng, userIds: new Set() })
      }

      gridCells.get(key)!.userIds.add(user.id)
    }

    // Convert to heatmap points with simulated alignment values
    const points = Array.from(gridCells.values()).map((cell) => {
      // Generate alignment value based on user density (more users = more varied opinions = neutral)
      const density = cell.userIds.size
      const value = density > 3 ? 0 : (Math.random() * 2 - 1) * 0.5 // Random between -0.5 and 0.5

      return {
        latitude: cell.lat,
        longitude: cell.lng,
        value,
        density,
      }
    })

    // Calculate stats
    let avgAlignment = 0.5

    if (session?.user?.id) {
      // Get user's votes for alignment calculation
      const userVotes = await prisma.vote.findMany({
        where: { userId: session.user.id },
        select: { promptId: true, value: true },
      })

      if (userVotes.length > 0) {
        // Get other users' votes on the same prompts
        const promptIds = userVotes.map(v => v.promptId)
        const otherUserIds = usersWithinRadius.map(u => u.id).filter(id => id !== session.user.id)

        if (otherUserIds.length > 0) {
          const neighborVotes = await prisma.vote.findMany({
            where: {
              userId: { in: otherUserIds },
              promptId: { in: promptIds },
            },
            select: { promptId: true, value: true },
          })

          // Calculate alignment
          const userVoteMap = new Map(userVotes.map(v => [v.promptId, v.value]))
          const neighborByPrompt = new Map<string, number[]>()

          for (const vote of neighborVotes) {
            if (vote.value === null) continue
            if (!neighborByPrompt.has(vote.promptId)) {
              neighborByPrompt.set(vote.promptId, [])
            }
            neighborByPrompt.get(vote.promptId)!.push(vote.value)
          }

          let alignmentSum = 0
          let alignmentCount = 0

          for (const [promptId, neighborValues] of neighborByPrompt) {
            const userValue = userVoteMap.get(promptId)
            if (userValue === undefined || userValue === null) continue

            const neighborAvg = neighborValues.reduce((sum, v) => sum + v, 0) / neighborValues.length
            const alignment = 1 - Math.abs(userValue - neighborAvg) / 2
            alignmentSum += alignment
            alignmentCount++
          }

          if (alignmentCount > 0) {
            avgAlignment = alignmentSum / alignmentCount
          }
        }
      }
    }

    return NextResponse.json({
      points,
      stats: {
        totalVotes: points.reduce((sum, p) => sum + p.density, 0),
        avgAlignment,
        userCount: usersWithinRadius.length,
      },
    })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json({ error: 'Failed to fetch heatmap' }, { status: 500 })
  }
}
