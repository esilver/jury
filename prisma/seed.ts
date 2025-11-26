import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const SEED_PROMPTS = [
  // Lifestyle
  { text: 'Pineapple belongs on pizza', type: 'STATEMENT' as const },
  { text: 'Dogs are better than cats', type: 'STATEMENT' as const },
  { text: 'Morning people are more productive', type: 'STATEMENT' as const },
  { text: 'Coffee is better than tea', type: 'STATEMENT' as const },
  { text: 'Working from home is better than office', type: 'STATEMENT' as const },

  // Technology
  { text: 'Social media has more benefits than drawbacks', type: 'STATEMENT' as const },
  { text: 'AI will create more jobs than it destroys', type: 'STATEMENT' as const },
  { text: 'Privacy is more important than convenience', type: 'STATEMENT' as const },
  { text: 'Electric cars are the future', type: 'STATEMENT' as const },

  // Society
  { text: 'Universal basic income is a good idea', type: 'STATEMENT' as const },
  { text: 'Climate change should be our top priority', type: 'STATEMENT' as const },
  { text: 'Free college education benefits society', type: 'STATEMENT' as const },

  // Personal
  { text: 'Money can buy happiness', type: 'STATEMENT' as const },
  { text: 'It\'s better to be honest than kind', type: 'STATEMENT' as const },
  { text: 'Failure is the best teacher', type: 'STATEMENT' as const },
]

async function main() {
  console.log('Starting seed...')

  // Create a demo user
  const passwordHash = await hash('password123', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@jury.app' },
    update: {},
    create: {
      email: 'demo@jury.app',
      name: 'Demo User',
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 5,
      latitude: 40.7128,
      longitude: -74.006,
    },
  })

  console.log(`Created demo user: ${demoUser.email}`)

  // Create seed prompts
  for (const prompt of SEED_PROMPTS) {
    const existing = await prisma.prompt.findFirst({
      where: { textLower: prompt.text.toLowerCase() },
    })

    if (!existing) {
      await prisma.prompt.create({
        data: {
          text: prompt.text,
          textLower: prompt.text.toLowerCase(),
          type: prompt.type,
          creatorId: demoUser.id,
          isPublic: true,
          trendingScore: Math.random() * 100,
          voteCount: Math.floor(Math.random() * 50),
        },
      })
      console.log(`Created prompt: ${prompt.text}`)
    }
  }

  // Create user metrics
  await prisma.userMetric.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      totalVotes: 0,
      totalPrompts: SEED_PROMPTS.length,
    },
  })

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
