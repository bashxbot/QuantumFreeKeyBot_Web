import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchUsers, getDb, ref, update, onValue } from '@/lib/firebase'
import {
  Users as UsersIcon,
  Crown,
  Ban,
  Search,
  MoreVertical,
  Plus,
  Minus,
  Shield,
  UserCheck,
  UserX,
  Eye,
  Gift
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassInput,
  DataTable,
  Modal,
  StatCard,
  Dropdown,
  Toggle,
  ProgressBar
} from '@/components/ui'
import { formatDate, formatNumber } from '@/lib/utils'
import { User } from '@/lib/types'

const vipColors = {
  silver: 'text-gray-300 bg-gray-300/10',
  gold: 'text-yellow-400 bg-yellow-400/10',
  platinum: 'text-purple-400 bg-purple-400/10',
}

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetchedUsers = await fetchUsers()
        setUsers(fetchedUsers)
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()

    // Set up real-time listener
    let unsubscribe: (() => void) | null = null
    
    getDb().then((database) => {
      const usersRef = ref(database, 'users')
      unsubscribe = onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersData: User[] = []
          snapshot.forEach((child) => {
            const userData = child.val()
            usersData.push({ 
              id: child.key!, 
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
          setUsers(usersData)
        }
      })
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsAction, setPointsAction] = useState<'add' | 'deduct'>('add')
  const [filterVip, setFilterVip] = useState('all')

  const stats = {
    total: users.length,
    active: users.filter(u => u.lastActive && Date.now() - u.lastActive < 86400000).length,
    vip: users.filter(u => u.vipTier).length,
    banned: users.filter(u => u.isBanned).length,
  }

  const filteredUsers = users.filter(user => {
    if (filterVip === 'vip' && !user.vipTier) return false
    if (filterVip === 'banned' && !user.isBanned) return false
    return true
  })

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handlePointsAction = (user: User, action: 'add' | 'deduct') => {
    setSelectedUser(user)
    setPointsAction(action)
    setPointsAmount('')
    setShowPointsModal(true)
  }

  const handleConfirmPoints = async () => {
    if (!selectedUser || !pointsAmount) return
    
    const amount = parseInt(pointsAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      const database = await getDb()
      const userRef = ref(database, `users/${selectedUser.id}`)
      const currentBalance = selectedUser.balance || 0
      
      let newBalance: number
      const updates: any = {}
      
      if (pointsAction === 'add') {
        newBalance = currentBalance + amount
        updates.balance = newBalance
        updates.totalPointsEarned = (selectedUser.totalPointsEarned || 0) + amount
      } else {
        newBalance = Math.max(0, currentBalance - amount)
        updates.balance = newBalance
      }
      
      await update(userRef, updates)
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, ...updates }
          : u
      ))
      
      setShowPointsModal(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating points:', error)
    }
  }

  const handleVipTierChange = async (tier: 'silver' | 'gold' | 'platinum') => {
    if (!selectedUser) return

    try {
      const database = await getDb()
      const userRef = ref(database, `users/${selectedUser.id}`)
      await update(userRef, { 
        vipTier: tier,
        isVIP: true 
      })
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, vipTier: tier }
          : u
      ))
      setSelectedUser({ ...selectedUser, vipTier: tier })
    } catch (error) {
      console.error('Error updating VIP tier:', error)
    }
  }

  const handleBanToggle = async () => {
    if (!selectedUser) return

    try {
      const database = await getDb()
      const userRef = ref(database, `users/${selectedUser.id}`)
      const newBanStatus = !selectedUser.isBanned
      
      await update(userRef, { isBanned: newBanStatus })
      
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, isBanned: newBanStatus }
          : u
      ))
      setSelectedUser({ ...selectedUser, isBanned: newBanStatus })
      setShowUserModal(false)
    } catch (error) {
      console.error('Error toggling ban status:', error)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (item: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
            <span className="text-white font-medium">{(item.name || 'U')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="font-medium text-white">{item.name || 'Unknown User'}</p>
            <p className="text-sm text-gray-400">@{item.username || 'unknown'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      render: (item: User) => (
        <span className="font-medium text-accent-cyan">{item.balance || 0} pts</span>
      )
    },
    {
      key: 'vipTier',
      header: 'VIP',
      sortable: true,
      render: (item: User) => (
        item.vipTier ? (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium capitalize ${vipColors[item.vipTier]}`}>
            <Crown size={12} />
            {item.vipTier}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        )
      )
    },
    {
      key: 'totalReferrals',
      header: 'Referrals',
      sortable: true,
    },
    {
      key: 'isBanned',
      header: 'Status',
      render: (item: User) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
          item.isBanned 
            ? 'bg-red-400/10 text-red-400' 
            : 'bg-green-400/10 text-green-400'
        }`}>
          {item.isBanned ? <UserX size={12} /> : <UserCheck size={12} />}
          {item.isBanned ? 'Banned' : 'Active'}
        </span>
      )
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      sortable: true,
      render: (item: User) => <span className="text-gray-400">{formatDate(item.joinedAt)}</span>
    },
    {
      key: 'actions',
      header: '',
      render: (item: User) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleViewUser(item); }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePointsAction(item, 'add'); }}
            className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handlePointsAction(item, 'deduct'); }}
            className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Minus size={16} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage users, VIP status, and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={<UsersIcon size={22} />}
          color="cyan"
          delay={0}
        />
        <StatCard
          title="Active (24h)"
          value={stats.active}
          icon={<UserCheck size={22} />}
          color="green"
          delay={0.1}
        />
        <StatCard
          title="VIP Users"
          value={stats.vip}
          icon={<Crown size={22} />}
          color="purple"
          delay={0.2}
        />
        <StatCard
          title="Banned"
          value={stats.banned}
          icon={<Ban size={22} />}
          color="red"
          delay={0.3}
        />
      </div>

      <GlassCard className="p-6" delay={0.4}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-white">All Users</h3>
          
          <div className="flex rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
            {(['all', 'vip', 'banned'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterVip(filter)}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  filterVip === filter
                    ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white'
                    : 'bg-[rgba(20,20,20,0.6)] text-gray-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          data={filteredUsers}
          columns={columns}
          pageSize={10}
          searchPlaceholder="Search users..."
          emptyMessage="No users found"
          onRowClick={handleViewUser}
        />
      </GlassCard>

      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{selectedUser.name[0]}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
                <p className="text-gray-400">@{selectedUser.username}</p>
                {selectedUser.vipTier && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 mt-2 rounded-lg text-xs font-medium capitalize ${vipColors[selectedUser.vipTier]}`}>
                    <Crown size={12} />
                    {selectedUser.vipTier} VIP
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <p className="text-gray-400 text-sm">Balance</p>
                <p className="text-2xl font-bold text-accent-cyan">{selectedUser.balance} pts</p>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <p className="text-gray-400 text-sm">Referrals</p>
                <p className="text-2xl font-bold text-white">{selectedUser.totalReferrals}</p>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <p className="text-gray-400 text-sm">Points Earned</p>
                <p className="text-2xl font-bold text-green-400">{selectedUser.totalPointsEarned}</p>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <p className="text-gray-400 text-sm">Points Spent</p>
                <p className="text-2xl font-bold text-orange-400">{selectedUser.totalPointsSpent}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-white">VIP Tier</h4>
              <div className="flex gap-2">
                {(['silver', 'gold', 'platinum'] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => handleVipTierChange(tier)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                      selectedUser.vipTier === tier
                        ? tier === 'silver' ? 'bg-gray-300/20 text-gray-300 border-2 border-gray-300'
                        : tier === 'gold' ? 'bg-yellow-400/20 text-yellow-400 border-2 border-yellow-400'
                        : 'bg-purple-400/20 text-purple-400 border-2 border-purple-400'
                        : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                  >
                    <Crown size={16} className="inline mr-2" />
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <GlassButton variant="secondary" className="flex-1" onClick={() => handlePointsAction(selectedUser, 'add')}>
                <Plus size={18} />
                <span className="ml-2">Add Points</span>
              </GlassButton>
              <GlassButton variant="secondary" className="flex-1" onClick={() => handlePointsAction(selectedUser, 'deduct')}>
                <Minus size={18} />
                <span className="ml-2">Deduct Points</span>
              </GlassButton>
              <GlassButton 
                variant={selectedUser.isBanned ? 'primary' : 'danger'}
                onClick={handleBanToggle}
              >
                {selectedUser.isBanned ? <UserCheck size={18} /> : <Ban size={18} />}
                <span className="ml-2">{selectedUser.isBanned ? 'Unban' : 'Ban'}</span>
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        title={pointsAction === 'add' ? 'Add Points' : 'Deduct Points'}
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400">
                {pointsAction === 'add' ? 'Add points to' : 'Deduct points from'}{' '}
                <span className="text-white font-medium">@{selectedUser.username}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Current balance: <span className="text-accent-cyan">{selectedUser.balance} pts</span>
              </p>
            </div>

            <GlassInput
              type="number"
              placeholder="Enter amount"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              className="text-center text-2xl"
            />

            <div className="flex gap-3">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowPointsModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton 
                variant={pointsAction === 'add' ? 'primary' : 'danger'} 
                className="flex-1"
                onClick={handleConfirmPoints}
              >
                {pointsAction === 'add' ? 'Add' : 'Deduct'} Points
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
