import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false
}: ToggleProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="font-medium text-white">{label}</p>}
          {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
        </div>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors duration-300',
          checked 
            ? 'bg-gradient-to-r from-accent-cyan to-accent-blue' 
            : 'bg-[rgba(255,255,255,0.1)]',
          !disabled && 'cursor-pointer'
        )}
        disabled={disabled}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md"
          animate={{ x: checked ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

interface DropdownProps {
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Dropdown({
  value,
  options,
  onChange,
  label,
  description,
  disabled = false
}: DropdownProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="font-medium text-white">{label}</p>}
          {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
        </div>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-4 py-2 bg-[rgba(20,20,20,0.8)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-accent-cyan transition-colors min-w-[120px]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px'
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-dark-700">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
