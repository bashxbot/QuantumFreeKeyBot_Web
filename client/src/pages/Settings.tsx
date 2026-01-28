import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Key,
  Gift,
  Users,
  Crown,
  Clock,
  Calendar,
  Save,
  RotateCcw,
  AlertTriangle,
  Globe
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  Toggle,
  Dropdown,
  Modal
} from '@/components/ui'
import { fetchSettings, updateSettings } from '@/lib/firebase'

interface BotSettings {
  keyClaimingEnabled: boolean
  dailyRewardsEnabled: boolean
  referralMultiplier: number
  maxKeysPerDay: number | 'unlimited'
  vipMultiplier: number
  autoExpiryWarnings: boolean
  weeklyBonusMultiplier: number
  maintenanceMode: boolean
  timezone: string
}

const defaultSettings: BotSettings = {
  keyClaimingEnabled: true,
  dailyRewardsEnabled: true,
  referralMultiplier: 1,
  maxKeysPerDay: 3,
  vipMultiplier: 1.5,
  autoExpiryWarnings: true,
  weeklyBonusMultiplier: 1.5,
  maintenanceMode: false,
  timezone: 'UTC'
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
]

export function Settings() {
  const [settings, setSettings] = useState<BotSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<BotSettings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const fetchedSettings = await fetchSettings()
        if (fetchedSettings) {
          const newSettings = { ...defaultSettings, ...fetchedSettings }
          setSettings(newSettings)
          setOriginalSettings(newSettings)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSetting = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      setOriginalSettings(settings)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(originalSettings)
    setHasChanges(false)
  }

  const handleEnableMaintenance = async () => {
    const newValue = !settings.maintenanceMode
    updateSetting('maintenanceMode', newValue)
    try {
      await updateSettings({ maintenanceMode: newValue })
      setOriginalSettings(prev => ({ ...prev, maintenanceMode: newValue }))
    } catch (error) {
      console.error('Error toggling maintenance:', error)
    }
    setShowMaintenanceModal(false)
  }

  const handleTimezoneChange = async (newTimezone: string) => {
    updateSetting('timezone', newTimezone)
    try {
      await updateSettings({ timezone: newTimezone })
      setOriginalSettings(prev => ({ ...prev, timezone: newTimezone }))
    } catch (error) {
      console.error('Error saving timezone:', error)
    }
    setShowTimezoneModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Configure your bot behavior</p>
        </div>
        
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <GlassButton variant="secondary" onClick={handleReset}>
              <RotateCcw size={18} />
              <span className="ml-2">Reset</span>
            </GlassButton>
            <GlassButton onClick={handleSave} disabled={saving}>
              <Save size={18} />
              <span className="ml-2">{saving ? 'Saving...' : 'Save Changes'}</span>
            </GlassButton>
          </motion.div>
        )}
      </div>

      {settings.maintenanceMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-orange-400/10 border border-orange-400/30 flex items-center gap-3"
        >
          <AlertTriangle className="text-orange-400" size={24} />
          <div>
            <p className="text-orange-400 font-medium">Maintenance Mode Active</p>
            <p className="text-orange-400/70 text-sm">Bot is currently disabled for users</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6" delay={0}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
              <Key size={20} className="text-accent-cyan" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Key Settings</h3>
              <p className="text-sm text-gray-400">Configure key claiming behavior</p>
            </div>
          </div>

          <div className="space-y-6">
            <Toggle
              checked={settings.keyClaimingEnabled}
              onChange={(checked) => updateSetting('keyClaimingEnabled', checked)}
              label="Key Claiming"
              description="Allow users to claim keys"
            />

            <Dropdown
              value={settings.maxKeysPerDay === 'unlimited' ? 'unlimited' : settings.maxKeysPerDay}
              options={[
                { value: 'unlimited', label: 'Unlimited' },
                { value: 1, label: '1 key per day' },
                { value: 3, label: '3 keys per day' },
                { value: 5, label: '5 keys per day' },
              ]}
              onChange={(val) => updateSetting('maxKeysPerDay', val === 'unlimited' ? 'unlimited' : Number(val))}
              label="Max Keys Per Day"
              description="Daily limit for key claims"
            />

            <Toggle
              checked={settings.autoExpiryWarnings}
              onChange={(checked) => updateSetting('autoExpiryWarnings', checked)}
              label="Auto Expiry Warnings"
              description="Notify users before key expiration"
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6" delay={0.1}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/20 to-green-500/20 flex items-center justify-center">
              <Gift size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Rewards Settings</h3>
              <p className="text-sm text-gray-400">Configure rewards and bonuses</p>
            </div>
          </div>

          <div className="space-y-6">
            <Toggle
              checked={settings.dailyRewardsEnabled}
              onChange={(checked) => updateSetting('dailyRewardsEnabled', checked)}
              label="Daily Rewards"
              description="Allow users to claim daily rewards"
            />

            <Dropdown
              value={settings.weeklyBonusMultiplier}
              options={[
                { value: 1, label: '1x (No bonus)' },
                { value: 1.5, label: '1.5x' },
                { value: 2, label: '2x' },
              ]}
              onChange={(val) => updateSetting('weeklyBonusMultiplier', Number(val))}
              label="Weekly Bonus Multiplier"
              description="Bonus points on weekends"
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6" delay={0.2}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center">
              <Users size={20} className="text-accent-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Referral Settings</h3>
              <p className="text-sm text-gray-400">Configure referral system</p>
            </div>
          </div>

          <div className="space-y-6">
            <Dropdown
              value={settings.referralMultiplier}
              options={[
                { value: 1, label: '1x (Normal)' },
                { value: 2, label: '2x (Double)' },
                { value: 3, label: '3x (Triple)' },
              ]}
              onChange={(val) => updateSetting('referralMultiplier', Number(val))}
              label="Referral Multiplier"
              description="Points earned per referral"
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6" delay={0.3}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 flex items-center justify-center">
              <Crown size={20} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">VIP Settings</h3>
              <p className="text-sm text-gray-400">Configure VIP privileges</p>
            </div>
          </div>

          <div className="space-y-6">
            <Dropdown
              value={settings.vipMultiplier}
              options={[
                { value: 1, label: '1x (No bonus)' },
                { value: 1.5, label: '1.5x' },
                { value: 2, label: '2x' },
              ]}
              onChange={(val) => updateSetting('vipMultiplier', Number(val))}
              label="VIP Points Multiplier"
              description="Bonus multiplier for VIP users"
            />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6" delay={0.4}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400/20 to-red-500/20 flex items-center justify-center">
            <SettingsIcon size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Advanced Settings</h3>
            <p className="text-sm text-gray-400">Advanced configuration options</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 mb-3">
              <Globe size={18} className="text-gray-400" />
              <span className="font-medium text-white">Timezone</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Current: {settings.timezone}
            </p>
            <GlassButton variant="secondary" size="sm" onClick={() => setShowTimezoneModal(true)}>
              Configure Timezone
            </GlassButton>
          </div>

          <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={18} className="text-gray-400" />
              <span className="font-medium text-white">Maintenance Mode</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              {settings.maintenanceMode ? 'Currently enabled' : 'Disable bot temporarily for maintenance'}
            </p>
            <GlassButton 
              variant={settings.maintenanceMode ? 'secondary' : 'danger'} 
              size="sm"
              onClick={() => setShowMaintenanceModal(true)}
            >
              {settings.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <Modal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title={settings.maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            {settings.maintenanceMode 
              ? 'This will re-enable the bot for all users.'
              : 'This will temporarily disable the bot for all users. Only admins will be able to access it.'}
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setShowMaintenanceModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton 
              variant={settings.maintenanceMode ? 'primary' : 'danger'} 
              className="flex-1"
              onClick={handleEnableMaintenance}
            >
              {settings.maintenanceMode ? 'Disable' : 'Enable'}
            </GlassButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showTimezoneModal}
        onClose={() => setShowTimezoneModal(false)}
        title="Configure Timezone"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-400 mb-4">
            Select the timezone for daily limit resets
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {timezones.map((tz) => (
              <button
                key={tz.value}
                onClick={() => handleTimezoneChange(tz.value)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  settings.timezone === tz.value
                    ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-blue/10 border border-accent-cyan/50 text-white'
                    : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                {tz.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
