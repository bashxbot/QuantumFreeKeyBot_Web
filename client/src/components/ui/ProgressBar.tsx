import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'cyan' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
  showLabel?: boolean
  label?: string
  animate?: boolean
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const colorClasses = {
  cyan: 'from-accent-cyan to-accent-blue',
  blue: 'from-accent-blue to-accent-purple',
  green: 'from-green-400 to-green-500',
  orange: 'from-orange-400 to-orange-500',
  red: 'from-red-400 to-red-500',
  purple: 'from-accent-purple to-pink-500'
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'cyan',
  showLabel = false,
  label,
  animate = true
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-gray-400">{label}</span>}
          {showLabel && <span className="text-white font-medium">{Math.round(percentage)}%</span>}
        </div>
      )}
      
      <div className={cn(
        'w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <motion.div
          className={cn(
            'h-full bg-gradient-to-r rounded-full',
            colorClasses[color]
          )}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'cyan' | 'blue' | 'green' | 'orange' | 'red' | 'purple'
  showLabel?: boolean
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'cyan',
  showLabel = true
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const gradientColors = {
    cyan: ['#00d4ff', '#0066ff'],
    blue: ['#0066ff', '#8b5cf6'],
    green: ['#4ade80', '#22c55e'],
    orange: ['#fb923c', '#f97316'],
    red: ['#f87171', '#ef4444'],
    purple: ['#8b5cf6', '#ec4899']
  }

  const gradientId = `progress-gradient-${color}`

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientColors[color][0]} />
            <stop offset="100%" stopColor={gradientColors[color][1]} />
          </linearGradient>
        </defs>
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {showLabel && (
        <span className="absolute text-white font-bold text-lg">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
