import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Key,
  Users,
  Package,
  Megaphone,
  Settings,
  HeadphonesIcon,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Key, label: 'Key Management', path: '/keys' },
  { icon: Users, label: 'User Management', path: '/users' },
  { icon: Package, label: 'Product Management', path: '/games' },
  { icon: Megaphone, label: 'Broadcast', path: '/broadcast' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HeadphonesIcon, label: 'Staff & Support', path: '/support' },
  { icon: Shield, label: 'Admin Management', path: '/admins' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      className="relative h-full bg-[rgba(10,10,10,0.9)] backdrop-blur-xl border-r border-[rgba(255,255,255,0.05)] z-20"
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
            <Zap className="text-white" size={22} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-lg font-bold text-white">Quantum Bot</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-white bg-gradient-to-r from-accent-cyan/20 to-accent-blue/10 border border-accent-cyan/30'
                    : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                )}
              >
                <Icon size={20} className={cn(isActive && 'text-accent-cyan')} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[rgba(255,255,255,0.05)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
