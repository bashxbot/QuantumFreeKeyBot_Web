export interface User {
  id: string
  name: string
  username: string
  balance: number
  totalReferrals: number
  referredBy: string | null
  joinedAt: number
  isBlocked: boolean
  isBanned: boolean
  channelJoined: boolean
  totalPointsEarned: number
  totalPointsSpent: number
  vipTier?: 'silver' | 'gold' | 'platinum'
  lastActive?: number
}

export interface Key {
  id: string
  code: string
  gameId: string
  gameName: string
  duration: number
  claimed: boolean
  claimedBy?: string
  claimedAt?: number
  addedAt: number
  expiresAt?: number
}

export interface Game {
  id: string
  name: string
  description?: string
  imageUrl?: string
  totalKeys: number
  claimedKeys: number
  availableKeys: number
  createdAt: number
}

export interface StaffMember {
  id: string
  oderId: string
  name: string
  username: string
  role: 'support' | 'moderator' | 'admin'
  addedAt: number
  isOnline: boolean
  totalChats?: number
}

export interface BotSettings {
  keyClaimingEnabled: boolean
  dailyRewardsEnabled: boolean
  referralMultiplier: 1 | 2 | 3
  maxKeysPerDay: number | 'unlimited'
  vipMultiplier: 1 | 1.5 | 2
  autoExpiryWarnings: boolean
  weeklyBonusMultiplier: 1 | 1.5 | 2
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  vipUsers: number
  bannedUsers: number
  totalKeys: number
  claimedKeys: number
  unclaimedKeys: number
  totalGames: number
  totalReferrals: number
}

export interface ChartData {
  name: string
  users: number
  keys: number
  referrals: number
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
}

export interface BroadcastTarget {
  type: 'all' | 'active' | 'channels' | 'groups' | 'vip'
  count: number
}

export interface SupportChat {
  id: string
  oderId: string
  staffId?: string
  messages: ChatMessage[]
  status: 'waiting' | 'active' | 'closed'
  startedAt: number
  endedAt?: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: number
  isStaff: boolean
}
