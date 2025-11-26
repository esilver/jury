import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// Simulated user data
const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah',
  'Isabella', 'Lucas', 'Mia', 'Mason', 'Charlotte', 'Logan', 'Amelia',
  'Alexander', 'Harper', 'Ethan', 'Evelyn', 'Jacob', 'Luna', 'Michael',
  'Camila', 'Daniel', 'Gianna', 'Henry', 'Abigail', 'Sebastian', 'Emily',
  'Jack', 'Elizabeth', 'Aiden', 'Sofia', 'Owen', 'Avery', 'Samuel', 'Ella',
  'Ryan', 'Scarlett', 'Nathan', 'Grace', 'Caleb', 'Chloe', 'Leo', 'Victoria',
  'Miles', 'Riley', 'Ezra', 'Aria', 'Adrian'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell'
]

// NYC area coordinates with some variance
const NYC_CENTER = { lat: 40.7128, lng: -74.006 }
const LOCATION_VARIANCE = 0.15 // ~10 miles radius

const SEED_PROMPTS = [
  // Lifestyle
  { text: 'Pineapple belongs on pizza', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Dogs are better than cats', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Morning people are more productive', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Coffee is better than tea', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Working from home is better than office', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'A hot dog is a sandwich', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Cereal is soup', type: 'STATEMENT' as const, category: 'lifestyle' },
  { text: 'Toilet paper should hang over, not under', type: 'STATEMENT' as const, category: 'lifestyle' },

  // Technology
  { text: 'Social media has more benefits than drawbacks', type: 'STATEMENT' as const, category: 'tech' },
  { text: 'AI will create more jobs than it destroys', type: 'STATEMENT' as const, category: 'tech' },
  { text: 'Privacy is more important than convenience', type: 'STATEMENT' as const, category: 'tech' },
  { text: 'Electric cars are the future', type: 'STATEMENT' as const, category: 'tech' },
  { text: 'We should colonize Mars', type: 'STATEMENT' as const, category: 'tech' },
  { text: 'Cryptocurrency will replace traditional banking', type: 'STATEMENT' as const, category: 'tech' },

  // Society
  { text: 'Universal basic income is a good idea', type: 'STATEMENT' as const, category: 'society' },
  { text: 'Climate change should be our top priority', type: 'STATEMENT' as const, category: 'society' },
  { text: 'Free college education benefits society', type: 'STATEMENT' as const, category: 'society' },
  { text: 'Voting should be mandatory', type: 'STATEMENT' as const, category: 'society' },
  { text: 'Healthcare is a human right', type: 'STATEMENT' as const, category: 'society' },

  // Personal
  { text: 'Money can buy happiness', type: 'STATEMENT' as const, category: 'personal' },
  { text: 'It\'s better to be honest than kind', type: 'STATEMENT' as const, category: 'personal' },
  { text: 'Failure is the best teacher', type: 'STATEMENT' as const, category: 'personal' },
  { text: 'You should always follow your passion', type: 'STATEMENT' as const, category: 'personal' },
  { text: 'People can fundamentally change', type: 'STATEMENT' as const, category: 'personal' },

  // Two-pole prompts
  {
    text: 'What matters more in a relationship?',
    type: 'TWO_POLE' as const,
    category: 'relationships',
    poleLeft: 'Trust',
    poleRight: 'Communication'
  },
  {
    text: 'In life, which is more valuable?',
    type: 'TWO_POLE' as const,
    category: 'personal',
    poleLeft: 'Time',
    poleRight: 'Money'
  },
  {
    text: 'What drives better results?',
    type: 'TWO_POLE' as const,
    category: 'work',
    poleLeft: 'Talent',
    poleRight: 'Hard Work'
  },
]

const SAMPLE_COMMENTS = [
  'Totally agree with this!',
  'I see your point but I disagree.',
  'This is such a hot take.',
  'Finally someone said it!',
  'Interesting perspective.',
  'Never thought about it this way.',
  'This changed my mind.',
  'Hard disagree here.',
  'Based take.',
  'This is controversial for sure.',
  'My friends and I argue about this all the time.',
  'Depends on the context honestly.',
]

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateLocation() {
  return {
    latitude: NYC_CENTER.lat + randomBetween(-LOCATION_VARIANCE, LOCATION_VARIANCE),
    longitude: NYC_CENTER.lng + randomBetween(-LOCATION_VARIANCE, LOCATION_VARIANCE),
  }
}

function generateVoteValue(type: string): number {
  if (type === 'STATEMENT') {
    // -1 (disapprove) to 1 (approve) with bias towards opinions
    const r = Math.random()
    if (r < 0.3) return -1
    if (r < 0.5) return randomBetween(-1, -0.3)
    if (r < 0.7) return randomBetween(0.3, 1)
    return 1
  } else {
    // Two-pole: -1 to 1 spectrum
    return randomBetween(-1, 1)
  }
}

async function main() {
  console.log('Starting seed...')

  const passwordHash = await hash('password123', 12)

  // Create demo user (for testing login)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@jury.app' },
    update: {},
    create: {
      email: 'demo@jury.app',
      name: 'Demo User',
      passwordHash,
      onboardingCompleted: true,
      onboardingStep: 5,
      latitude: NYC_CENTER.lat,
      longitude: NYC_CENTER.lng,
    },
  })
  console.log(`Created demo user: ${demoUser.email}`)

  // Create simulated users
  const NUM_SIMULATED_USERS = 50
  const simulatedUsers: { id: string; name: string }[] = []

  console.log(`Creating ${NUM_SIMULATED_USERS} simulated users...`)

  for (let i = 0; i < NUM_SIMULATED_USERS; i++) {
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    const name = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`
    const location = generateLocation()

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        onboardingCompleted: true,
        onboardingStep: 5,
        latitude: Math.round(location.latitude * 100) / 100,
        longitude: Math.round(location.longitude * 100) / 100,
      },
    })
    simulatedUsers.push({ id: user.id, name: user.name || name })
  }
  console.log(`Created ${simulatedUsers.length} simulated users`)

  // Create prompts
  const createdPrompts: { id: string; type: string; text: string }[] = []

  for (const prompt of SEED_PROMPTS) {
    const existing = await prisma.prompt.findFirst({
      where: { textLower: prompt.text.toLowerCase() },
    })

    if (!existing) {
      const creator = Math.random() > 0.7 ? demoUser : randomElement(simulatedUsers)
      const created = await prisma.prompt.create({
        data: {
          text: prompt.text,
          textLower: prompt.text.toLowerCase(),
          type: prompt.type,
          poleLeft: (prompt as any).poleLeft || null,
          poleRight: (prompt as any).poleRight || null,
          creatorId: creator.id,
          isPublic: true,
          trendingScore: Math.random() * 100,
          voteCount: 0,
        },
      })
      createdPrompts.push({ id: created.id, type: created.type, text: created.text })
      console.log(`Created prompt: ${prompt.text}`)
    } else {
      createdPrompts.push({ id: existing.id, type: existing.type, text: existing.text })
    }
  }

  // Create votes from simulated users
  console.log('Creating votes...')
  let voteCount = 0

  for (const user of [...simulatedUsers, { id: demoUser.id, name: demoUser.name }]) {
    // Each user votes on 60-90% of prompts
    const promptsToVote = createdPrompts.filter(() => Math.random() > 0.2)

    for (const prompt of promptsToVote) {
      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_promptId: {
            promptId: prompt.id,
            userId: user.id,
          },
        },
      })

      if (!existingVote) {
        const value = generateVoteValue(prompt.type)
        await prisma.vote.create({
          data: {
            promptId: prompt.id,
            userId: user.id,
            value,
          },
        })
        voteCount++
      }
    }
  }
  console.log(`Created ${voteCount} votes`)

  // Update prompt vote counts
  for (const prompt of createdPrompts) {
    const count = await prisma.vote.count({ where: { promptId: prompt.id } })
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { voteCount: count },
    })
  }

  // Create some comments
  console.log('Creating comments...')
  let commentCount = 0

  for (const prompt of createdPrompts.slice(0, 10)) {
    const numComments = Math.floor(Math.random() * 8) + 2

    for (let i = 0; i < numComments; i++) {
      const commenter = randomElement([...simulatedUsers, { id: demoUser.id, name: demoUser.name }])
      const text = randomElement(SAMPLE_COMMENTS)

      await prisma.comment.create({
        data: {
          promptId: prompt.id,
          userId: commenter.id,
          text,
        },
      })
      commentCount++
    }
  }
  console.log(`Created ${commentCount} comments`)

  // Create some matches based on voting similarity
  console.log('Creating matches...')
  let matchCount = 0

  // Create matches between demo user and some simulated users
  const potentialMatches = simulatedUsers.slice(0, 15)

  for (const simUser of potentialMatches) {
    const score = randomBetween(0.5, 0.95)

    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { user1Id: demoUser.id, user2Id: simUser.id },
          { user1Id: simUser.id, user2Id: demoUser.id },
        ],
      },
    })

    if (!existingMatch) {
      await prisma.match.create({
        data: {
          user1Id: demoUser.id,
          user2Id: simUser.id,
          type: 'SIMILAR',
          score,
        },
      })
      matchCount++
    }
  }
  console.log(`Created ${matchCount} matches`)

  // Update user metrics
  console.log('Updating user metrics...')

  for (const user of [...simulatedUsers, { id: demoUser.id, name: demoUser.name }]) {
    const totalVotes = await prisma.vote.count({ where: { userId: user.id } })
    const totalPrompts = await prisma.prompt.count({ where: { creatorId: user.id } })

    await prisma.userMetric.upsert({
      where: { userId: user.id },
      update: { totalVotes, totalPrompts },
      create: {
        userId: user.id,
        totalVotes,
        totalPrompts,
      },
    })
  }

  console.log('Seed completed!')
  console.log(`
Summary:
- 1 demo user (demo@jury.app / password123)
- ${simulatedUsers.length} simulated users
- ${createdPrompts.length} prompts
- ${voteCount} votes
- ${commentCount} comments
- ${matchCount} matches
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
