// Re-export Prisma types
export type {
  User,
  Prompt,
  PromptChoice,
  Vote,
  VoteVersion,
  Comment,
  CommentReaction,
  Flag,
  SavedPrompt,
  SavedRadius,
  Match,
  Message,
  Group,
  GroupMember,
} from '@prisma/client'

export { PromptType, MultiChoiceMode, FlagType, FlagStatus, MatchType, GroupRole } from '@prisma/client'

// Extended types for the frontend
export interface PromptWithStats {
  id: string
  text: string
  type: 'STATEMENT' | 'TWO_POLE' | 'MULTI_CHOICE'
  poleLeft?: string | null
  poleRight?: string | null
  multiChoiceMode?: 'SINGLE_SELECT' | 'MULTI_SELECT' | null
  choices: {
    id: string
    text: string
    order: number
  }[]
  mediaAttachments: {
    id: string
    type: string
    url: string
    thumbnailUrl?: string | null
  }[]
  creatorId: string
  voteCount: number
  createdAt: Date

  // Computed stats
  approvePercent?: number
  disapprovePercent?: number
  choiceDistribution?: Record<string, number>
  userVote?: {
    value?: number | null
    choiceIds?: string[]
  } | null
}

export interface VoteInput {
  promptId: string
  value?: number // For STATEMENT and TWO_POLE (-1 to 1)
  choiceIds?: string[] // For MULTI_CHOICE
  latitude?: number
  longitude?: number
}

export interface UserProfile {
  id: string
  displayName?: string | null
  name?: string | null
  bio?: string | null
  avatarUrl?: string | null
  onboardingCompleted: boolean
  publicPrompts?: PromptWithStats[]
}

export interface HeatmapPoint {
  latitude: number
  longitude: number
  value: number // -1 to 1 (red to green)
  density: number // Number of votes
}

export interface RadiusConfig {
  latitude: number
  longitude: number
  radiusMiles: number
}

export interface MatchAlert {
  id: string
  type: 'SIMILAR' | 'OPPOSITE'
  score: number
  userId: string
  userDisplayName?: string
  promptId?: string
  promptText?: string
}

export interface FeedFilters {
  sortBy: 'distance' | 'trending' | 'newest'
  radiusMiles?: number
  latitude?: number
  longitude?: number
}
