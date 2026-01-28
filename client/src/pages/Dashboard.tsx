import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchUsers, fetchKeys, fetchGames, fetchStatistics } from '@/lib/firebase'
import {
  Users,
  Key,
  Gamepad2,
  UserPlus,
  Crown,
  Ban,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  Activity
} from 'lucide-react'
import { GlassCard, GlassButton, StatCard } from '@/components/ui'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

interface WeeklyDataPoint {
  name: string
  users: number
  keys: number
  referrals: number
}

interface Activity {
  id: string
  type: string
  message: string
  time: string
}

interface TopGame {
  name: string
  keys: number
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number; name: string; color: string}>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-glass">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    vipUsers: 0,
    bannedUsers: 0,
    totalKeys: 0,
    claimedKeys: 0,
    unclaimedKeys: 0,
    totalGames: 0,
    totalReferrals: 0,
  })
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([])
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [topGames, setTopGames] = useState<TopGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const results = await Promise.all([
          fetchUsers().catch(err => { console.error('Error fetching users:', err); return []; }),
          fetchKeys().catch(err => { console.error('Error fetching keys:', err); return []; }),
          fetchGames().catch(err => { console.error('Error fetching games:', err); return []; }),
          fetchStatistics().catch(err => { console.error('Error fetching statistics:', err); return { totalReferrals: 0 }; }),
          fetch('/api/statistics/weekly').then(r => r.json()).catch(err => { console.error('Error fetching weekly stats:', err); return []; }),
          fetch('/api/statistics/recent-activity').then(r => r.json()).catch(err => { console.error('Error fetching recent activity:', err); return []; }),
          fetch('/api/statistics/top-games').then(r => r.json()).catch(err => { console.error('Error fetching top games:', err); return []; })
        ]);

        const [users, keys, games, statistics, weekly, activity, topGamesData] = results;

        const now = Date.now()
        const oneDayAgo = now - 86400000

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.lastActive && u.lastActive > oneDayAgo).length,
          newUsers: users.filter(u => u.joinedAt > oneDayAgo).length,
          vipUsers: users.filter(u => u.vipTier).length,
          bannedUsers: users.filter(u => u.isBanned).length,
          totalKeys: keys.length,
          claimedKeys: keys.filter(k => k.claimed).length,
          unclaimedKeys: keys.filter(k => !k.claimed).length,
          totalGames: games.length,
          totalReferrals: statistics.totalReferrals || 0,
        })

        setWeeklyData(weekly)
        setRecentActivity(activity)
        setTopGames(topGamesData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's your bot overview.</p>
        </div>
        <GlassButton onClick={() => {
          document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}>
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <span>View Analytics</span>
          </div>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={22} />}
          trend={12.5}
          trendLabel="vs last week"
          color="cyan"
          delay={0}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<Activity size={22} />}
          trend={8.2}
          trendLabel="vs last week"
          color="green"
          delay={0.1}
        />
        <StatCard
          title="New Users"
          value={stats.newUsers}
          icon={<UserPlus size={22} />}
          trend={25.8}
          trendLabel="today"
          color="blue"
          delay={0.2}
        />
        <StatCard
          title="VIP Users"
          value={stats.vipUsers}
          icon={<Crown size={22} />}
          trend={5.3}
          trendLabel="vs last week"
          color="purple"
          delay={0.3}
        />
        <StatCard
          title="Banned Users"
          value={stats.bannedUsers}
          icon={<Ban size={22} />}
          trend={-2.1}
          trendLabel="vs last week"
          color="red"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Keys"
          value={stats.totalKeys}
          icon={<Key size={22} />}
          color="orange"
          delay={0.5}
        />
        <StatCard
          title="Claimed Keys"
          value={stats.claimedKeys}
          icon={<CheckCircle size={22} />}
          color="green"
          delay={0.6}
        />
        <StatCard
          title="Unclaimed Keys"
          value={stats.unclaimedKeys}
          icon={<XCircle size={22} />}
          color="red"
          delay={0.7}
        />
        <StatCard
          title="Total Products"
          value={stats.totalGames}
          icon={<Gamepad2 size={22} />}
          color="purple"
          delay={0.8}
        />
      </div>

      <div id="analytics-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6" delay={0.9}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">7-Day Growth</h3>
              <p className="text-sm text-gray-400">Users, Keys & Referrals</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-cyan" />
                <span className="text-gray-400">Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-blue" />
                <span className="text-gray-400">Keys</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-purple" />
                <span className="text-gray-400">Referrals</span>
              </div>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorKeys" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0066ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="users" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Users" />
                <Area type="monotone" dataKey="keys" stroke="#0066ff" strokeWidth={2} fillOpacity={1} fill="url(#colorKeys)" name="Keys" />
                <Area type="monotone" dataKey="referrals" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorReferrals)" name="Referrals" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6" delay={1.0}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>

          <div className="space-y-4">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight size={14} className="text-accent-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6" delay={1.2}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Top Products</h3>
              <p className="text-sm text-gray-400">By keys claimed</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topGames.length > 0 ? topGames : [{ name: 'No data', keys: 0 }]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="keys" fill="url(#barGradient)" radius={[0, 8, 8, 0]} name="Keys">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00d4ff" />
                      <stop offset="100%" stopColor="#0066ff" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6" delay={1.3}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              <p className="text-sm text-gray-400">Common admin tasks</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassButton variant="secondary" className="justify-center py-4" onClick={() => { window.location.hash = '#/keys' }}>
              <div className="flex flex-col items-center gap-2">
                <Key size={24} className="text-accent-cyan" />
                <span className="text-sm">Add Keys</span>
              </div>
            </GlassButton>
            <GlassButton variant="secondary" className="justify-center py-4" onClick={() => { window.location.hash = '#/games' }}>
              <div className="flex flex-col items-center gap-2">
                <Gamepad2 size={24} className="text-accent-blue" />
                <span className="text-sm">Add Game</span>
              </div>
            </GlassButton>
            <GlassButton variant="secondary" className="justify-center py-4" onClick={() => { window.location.hash = '#/broadcast' }}>
              <div className="flex flex-col items-center gap-2">
                <TrendingUp size={24} className="text-green-400" />
                <span className="text-sm">Broadcast</span>
              </div>
            </GlassButton>
            <GlassButton variant="secondary" className="justify-center py-4" onClick={() => { window.location.hash = '#/users' }}>
              <div className="flex flex-col items-center gap-2">
                <Users size={24} className="text-accent-purple" />
                <span className="text-sm">View Users</span>
              </div>
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}