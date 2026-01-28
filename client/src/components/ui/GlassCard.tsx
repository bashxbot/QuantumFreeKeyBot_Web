import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  animate?: boolean
  delay?: number
  onClick?: () => void
}

export function GlassCard({ 
  children, 
  className, 
  hover = false, 
  animate = true,
  delay = 0,
  onClick 
}: GlassCardProps) {
  const baseClasses = cn(
    'bg-[rgba(20,20,20,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-glass',
    hover && 'transition-all duration-300 hover:bg-[rgba(30,30,30,0.9)] hover:border-[rgba(255,255,255,0.15)] hover:shadow-glass-lg cursor-pointer',
    className
  )

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  )
}

interface GlassButtonProps {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function GlassButton({ 
  children, 
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button'
}: GlassButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }

  const variantClasses = {
    primary: 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white hover:shadow-cyan-glow',
    secondary: 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
  }

  return (
    <motion.button
      type={type}
      className={cn(
        'rounded-xl font-medium transition-all duration-300',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.button>
  )
}

interface GlassInputProps {
  type?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  icon?: ReactNode
  min?: string
  required?: boolean
  disabled?: boolean
}

export function GlassInput({ 
  type = 'text',
  placeholder,
  value,
  onChange,
  className,
  icon,
  min,
  required,
  disabled
}: GlassInputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        required={required}
        disabled={disabled}
        className={cn(
          'w-full px-4 py-3 bg-[rgba(20,20,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all duration-300',
          icon && 'pl-12',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      />
    </div>
  )
}

interface GlassTextareaProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
  rows?: number
  disabled?: boolean
}

export function GlassTextarea({ 
  placeholder,
  value,
  onChange,
  className,
  rows = 4,
  disabled
}: GlassTextareaProps) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-3 bg-[rgba(20,20,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all duration-300 resize-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    />
  )
}