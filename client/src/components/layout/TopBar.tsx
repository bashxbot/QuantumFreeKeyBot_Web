import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { GlassInput } from '../ui/GlassCard'

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
}

const mockNotifications: Notification[] = [
  { id: '1', title: 'New user joined', message: 'John Doe registered via referral', time: '2m ago', read: false },
  { id: '2', title: 'Key claimed', message: 'User claimed a 30-day key', time: '15m ago', read: false },
  { id: '3', title: 'Broadcast complete', message: 'Message sent to 1,234 users', time: '1h ago', read: true },
]

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications] = useState<Notification[]>(mockNotifications)

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-[rgba(10,10,10,0.8)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.05)] z-10">
      <div className="flex-1 max-w-md">
        <GlassInput
          placeholder="Search users, keys, products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={18} />}
          className="py-2"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfile(false)
            }}
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-accent-cyan rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-xl shadow-glass-lg overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.1)]">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer ${
                        !notification.read ? 'bg-[rgba(0,212,255,0.05)]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notification.read && (
                          <span className="w-2 h-2 mt-2 rounded-full bg-accent-cyan flex-shrink-0" />
                        )}
                        <div className={!notification.read ? '' : 'ml-5'}>
                          <p className="font-medium text-white text-sm">{notification.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{notification.message}</p>
                          <p className="text-gray-500 text-xs mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.1)]">
                  <button className="w-full text-center text-sm text-accent-cyan hover:text-accent-blue transition-colors">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile)
              setShowNotifications(false)
            }}
            className="flex items-center gap-3 p-2 pr-3 rounded-xl hover:bg-[rgba(255,255,255,0.05)] transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-gray-500">Owner</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-48 bg-[rgba(20,20,20,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-xl shadow-glass-lg overflow-hidden"
              >
                <div className="py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    <Settings size={16} />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('isAdminAuthenticated');
                      window.location.href = '/login';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
