
import { initializeApp, FirebaseApp } from 'firebase/app'
import { getDatabase as getFirebaseDb, ref as dbRef, get, set, update, push, remove, onValue, DataSnapshot, Database } from 'firebase/database'

let app: FirebaseApp | null = null
let database: Database | null = null
let initPromise: Promise<Database> | null = null

const initFirebase = async (): Promise<Database> => {
  if (database) return database
  
  if (initPromise) {
    return initPromise
  }
  
  initPromise = (async () => {
    try {
      const response = await fetch('/api/config')
      const config = await response.json()
      
      const firebaseConfig = {
        databaseURL: config.firebaseDatabaseUrl
      }
      
      app = initializeApp(firebaseConfig)
      database = getFirebaseDb(app)
      return database
    } catch (error) {
      console.error('Failed to initialize Firebase:', error)
      throw error
    }
  })()
  
  return initPromise
}

const getDb = async (): Promise<Database> => {
  return initFirebase()
}

export { get, set, update, push, remove, onValue, getDb, initFirebase, dbRef as ref }
export type { DataSnapshot }

export const fetchUsers = async () => {
  const db = await getDb()
  const usersRef = dbRef(db, 'users')
  const snapshot = await get(usersRef)
  if (snapshot.exists()) {
    const users: any[] = []
    snapshot.forEach((child) => {
      const userData = child.val()
      users.push({ 
        id: child.key, 
        name: userData.name || userData.firstName || userData.first_name || `User ${child.key?.slice(-4)}`,
        username: userData.username || userData.userName || 'unknown',
        balance: userData.balance || userData.points || 0,
        totalReferrals: userData.totalReferrals || userData.referralCount || 0,
        totalPointsEarned: userData.totalPointsEarned || 0,
        totalPointsSpent: userData.totalPointsSpent || 0,
        joinedAt: userData.joinedAt || userData.createdAt || Date.now(),
        lastActive: userData.lastActive || userData.lastSeen || null,
        isBanned: userData.isBanned || userData.banned || false,
        isBlocked: userData.isBlocked || userData.blocked || false,
        vipTier: userData.vipTier || null,
        referredBy: userData.referredBy || null,
        channelJoined: userData.channelJoined !== false,
        ...userData 
      })
    })
    return users
  }
  return []
}

export const fetchKeys = async () => {
  const db = await getDb()
  const keysRef = dbRef(db, 'keys')
  const snapshot = await get(keysRef)
  if (snapshot.exists()) {
    const keys: any[] = []
    snapshot.forEach((child) => {
      const keyData = child.val()
      keys.push({ 
        id: child.key, 
        code: keyData.key || keyData.code || child.key,
        claimed: keyData.status === 'active' || keyData.status === 'claimed' || keyData.userId != null,
        claimedBy: keyData.userId || null,
        claimedAt: keyData.claimedAt || null,
        ...keyData 
      })
    })
    return keys
  }
  return []
}

export const fetchGames = async () => {
  const db = await getDb()
  const gamesRef = dbRef(db, 'games')
  const snapshot = await get(gamesRef)
  if (snapshot.exists()) {
    const games: any[] = []
    snapshot.forEach((child) => {
      const gameData = child.val()
      games.push({ 
        id: child.key, 
        ...gameData,
        totalKeys: gameData.totalKeys || 0,
        claimedKeys: gameData.claimedKeys || 0,
        availableKeys: gameData.unclaimedKeys || gameData.availableKeys || 0
      })
    })
    return games
  }
  return []
}

export const fetchStatistics = async () => {
  const db = await getDb()
  const statsRef = dbRef(db, 'statistics')
  const snapshot = await get(statsRef)
  return snapshot.exists() ? snapshot.val() : {}
}

export const fetchSettings = async () => {
  const db = await getDb()
  const settingsRef = dbRef(db, 'settings')
  const snapshot = await get(settingsRef)
  if (snapshot.exists()) {
    const data = snapshot.val()
    return {
      keyClaimingEnabled: data.claimingEnabled !== false,
      dailyRewardsEnabled: data.dailyRewardEnabled !== false,
      referralMultiplier: data.referralMultiplier || 1,
      maxKeysPerDay: data.maxKeysPerDay || 'unlimited',
      vipMultiplier: data.vipPointsMultiplier || 1.5,
      autoExpiryWarnings: data.autoExpiryWarnings !== false,
      weeklyBonusMultiplier: data.weeklyBonusMultiplier || 1,
      maintenanceMode: data.maintenanceMode || false,
      timezone: data.timezone || 'UTC'
    }
  }
  return null
}

export const updateSettings = async (settings: Record<string, any>) => {
  const db = await getDb()
  const updates: Record<string, any> = {}
  
  if (settings.keyClaimingEnabled !== undefined) {
    updates['settings/claimingEnabled'] = settings.keyClaimingEnabled
  }
  if (settings.dailyRewardsEnabled !== undefined) {
    updates['settings/dailyRewardEnabled'] = settings.dailyRewardsEnabled
  }
  if (settings.referralMultiplier !== undefined) {
    updates['settings/referralMultiplier'] = settings.referralMultiplier
  }
  if (settings.maxKeysPerDay !== undefined) {
    updates['settings/maxKeysPerDay'] = settings.maxKeysPerDay
  }
  if (settings.vipMultiplier !== undefined) {
    updates['settings/vipPointsMultiplier'] = settings.vipMultiplier
  }
  if (settings.autoExpiryWarnings !== undefined) {
    updates['settings/autoExpiryWarnings'] = settings.autoExpiryWarnings
  }
  if (settings.weeklyBonusMultiplier !== undefined) {
    updates['settings/weeklyBonusMultiplier'] = settings.weeklyBonusMultiplier
  }
  if (settings.maintenanceMode !== undefined) {
    updates['settings/maintenanceMode'] = settings.maintenanceMode
  }
  if (settings.timezone !== undefined) {
    updates['settings/timezone'] = settings.timezone
  }
  
  const rootRef = dbRef(db)
  await update(rootRef, updates)
}

export const addKeys = async (keys: { code: string; gameId: string; gameName: string; duration: number }[]) => {
  const db = await getDb()
  const keysRef = dbRef(db, 'keys')
  
  for (const key of keys) {
    const newKeyRef = push(keysRef)
    await set(newKeyRef, {
      key: key.code,
      gameId: key.gameId,
      gameName: key.gameName,
      duration: key.duration,
      userId: null,
      claimedAt: null,
      expiresAt: null,
      status: 'unclaimed',
      addedAt: Date.now()
    })
  }
  
  const gameRef = dbRef(db, `games/${keys[0].gameId}`)
  const gameSnapshot = await get(gameRef)
  if (gameSnapshot.exists()) {
    const gameData = gameSnapshot.val()
    await update(gameRef, {
      totalKeys: (gameData.totalKeys || 0) + keys.length,
      unclaimedKeys: (gameData.unclaimedKeys || 0) + keys.length
    })
  }
}

export const deleteKey = async (keyId: string) => {
  const db = await getDb()
  const keyRef = dbRef(db, `keys/${keyId}`)
  await remove(keyRef)
}

export const fetchBroadcasts = async () => {
  const db = await getDb()
  const broadcastsRef = dbRef(db, 'broadcasts')
  const snapshot = await get(broadcastsRef)
  if (snapshot.exists()) {
    const broadcasts: any[] = []
    snapshot.forEach((child) => {
      broadcasts.push({ id: child.key, ...child.val() })
    })
    return broadcasts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }
  return []
}

export const createBroadcast = async (data: { message: string; target: string; targetCount: number }) => {
  const db = await getDb()
  const broadcastsRef = dbRef(db, 'broadcasts')
  const newBroadcastRef = push(broadcastsRef)
  
  const broadcast = {
    message: data.message,
    target: data.target,
    targetCount: data.targetCount,
    timestamp: Date.now(),
    status: 'pending',
    sent: 0,
    delivered: 0,
    failed: 0
  }
  
  await set(newBroadcastRef, broadcast)
  return { id: newBroadcastRef.key, ...broadcast }
}

export const fetchStaffMembers = async () => {
  const db = await getDb()
  const staffRef = dbRef(db, 'staff')
  const snapshot = await get(staffRef)
  if (snapshot.exists()) {
    const staff: any[] = []
    snapshot.forEach((child) => {
      staff.push({ id: child.key, oderId: child.key, ...child.val() })
    })
    return staff
  }
  return []
}

export const fetchSupportChats = async () => {
  const db = await getDb()
  const chatsRef = dbRef(db, 'supportChats')
  const snapshot = await get(chatsRef)
  if (snapshot.exists()) {
    const chats: any[] = []
    snapshot.forEach((child) => {
      chats.push({ id: child.key, oderId: child.key, ...child.val() })
    })
    return chats
  }
  return []
}

// For pages that need to wait for db initialization
export const waitForDb = async () => {
  await initFirebase()
  return database!
}

// Add/remove staff member helpers
export const addStaffMember = async (data: { telegramId: string; name: string; username: string; role: string }) => {
  const db = await getDb()
  const staffRef = dbRef(db, 'staff')
  const newStaffRef = push(staffRef)
  await set(newStaffRef, {
    oderId: data.telegramId,
    name: data.name,
    username: data.username,
    role: data.role,
    addedAt: Date.now(),
    isOnline: false
  })
}

export const removeStaffMember = async (staffId: string) => {
  const db = await getDb()
  const staffRef = dbRef(db, `staff/${staffId}`)
  await remove(staffRef)
}

// Alias for backward compatibility
export const fetchStaff = fetchStaffMembers
export const fetchSupportSessions = fetchSupportChats
