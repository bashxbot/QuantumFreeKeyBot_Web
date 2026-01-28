import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  icon: ReactNode
  trend?: number
  trendLabel?: string
  color?: 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'red'
  delay?: number
}

const colorClasses = {
  cyan: {
    icon: 'text-accent-cyan',
    glow: 'shadow-cyan-glow',
    bg: 'from-accent-cyan/20 to-accent-cyan/5'
  },
  blue: {
    icon: 'text-accent-blue',
    glow: 'shadow-blue-glow',
    bg: 'from-accent-blue/20 to-accent-blue/5'
  },
  purple: {
    icon: 'text-accent-purple',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    bg: 'from-accent-purple/20 to-accent-purple/5'
  },
  green: {
    icon: 'text-green-400',
    glow: 'shadow-[0_0_20px_rgba(74,222,128,0.3)]',
    bg: 'from-green-400/20 to-green-400/5'
  },
  orange: {
    icon: 'text-orange-400',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
    bg: 'from-orange-400/20 to-orange-400/5'
  },
  red: {
    icon: 'text-red-400',
    glow: 'shadow-[0_0_20px_rgba(248,113,113,0.3)]',
    bg: 'from-red-400/20 to-red-400/5'
  }
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendLabel,
  color = 'cyan',
  delay = 0
}: StatCardProps) {
  const colors = colorClasses[color]
  const isPositive = trend && trend > 0
  const isNegative = trend && trend < 0

  return (
    <motion.div
      className="relative overflow-hidden bg-[rgba(20,20,20,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-glass group"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-bl-full opacity-50 transition-opacity duration-300 group-hover:opacity-70',
        colors.bg
      )} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'p-3 rounded-xl bg-gradient-to-br',
            colors.bg
          )}>
            <span className={colors.icon}>{icon}</span>
          </div>

          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg',
              isPositive && 'text-green-400 bg-green-400/10',
              isNegative && 'text-red-400 bg-red-400/10',
              !isPositive && !isNegative && 'text-gray-400 bg-gray-400/10'
            )}>
              {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : null}
              <span>{isPositive ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>

        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>

        <motion.p
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          {formatNumber(value)}
        </motion.p>

        {trendLabel && (
          <p className="text-gray-500 text-xs mt-2">{trendLabel}</p>
        )}
      </div>
    </motion.div>
  )
}