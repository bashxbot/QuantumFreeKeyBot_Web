import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone,
  Users,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Bold,
  Italic,
  Link,
  Image,
  RefreshCw,
  X
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassTextarea,
  ProgressBar,
  Modal
} from '@/components/ui'
import { fetchBroadcasts, createBroadcast, fetchUsers, getDb, ref, onValue } from '@/lib/firebase'

interface BroadcastHistory {
  id: string
  message: string
  target: string
  targetCount: number
  sent: number
  delivered: number
  failed: number
  timestamp: number
  status: string
}

interface TargetData {
  id: string
  label: string
  count: number
}

export function Broadcast() {
  const [message, setMessage] = useState('')
  const [selectedTarget, setSelectedTarget] = useState('all')
  const [isSending, setIsSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [history, setHistory] = useState<BroadcastHistory[]>([])
  const [targets, setTargets] = useState<TargetData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastHistory | null>(null)
  const [broadcastProgress, setBroadcastProgress] = useState({ sent: 0, delivered: 0, failed: 0, total: 0 })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [broadcasts, users] = await Promise.all([
        fetchBroadcasts(),
        fetchUsers()
      ])
      
      setHistory(broadcasts)
      
      const now = Date.now()
      const oneDayAgo = now - 86400000
      
      setTargets([
        { id: 'all', label: 'All Users', count: users.length },
        { id: 'active', label: 'Active Users', count: users.filter((u: any) => u.lastActive && u.lastActive > oneDayAgo).length },
        { id: 'vip', label: 'VIP Users', count: users.filter((u: any) => u.vipTier).length },
      ])
    } catch (error) {
      console.error('Error loading broadcast data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeBroadcast?.id) {
      let unsubscribe: (() => void) | null = null
      
      getDb().then((database) => {
        const broadcastRef = ref(database, `broadcasts/${activeBroadcast.id}`)
        unsubscribe = onValue(broadcastRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            setBroadcastProgress({
              sent: data.sent || 0,
              delivered: data.delivered || 0,
              failed: data.failed || 0,
              total: data.targetCount || activeBroadcast.targetCount || 0
            })
            
            if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') {
              setTimeout(() => {
                setIsSending(false)
                setActiveBroadcast(null)
                setMessage('')
                loadData()
              }, 1500)
            }
          }
        })
      })
      
      return () => { if (unsubscribe) unsubscribe() }
    }
  }, [activeBroadcast?.id])

  const selectedTargetData = targets.find(t => t.id === selectedTarget)

  const handleSend = async () => {
    if (!message.trim() || !selectedTargetData) return
    
    setIsSending(true)
    setBroadcastProgress({ sent: 0, delivered: 0, failed: 0, total: selectedTargetData.count })
    
    try {
      const broadcast = await createBroadcast({
        message: message.trim(),
        target: selectedTargetData.label,
        targetCount: selectedTargetData.count
      })
      
      setActiveBroadcast(broadcast as BroadcastHistory)
      
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: broadcast.id,
          message: message.trim(),
          target: selectedTargetData.label
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start broadcast')
      }
      
    } catch (error) {
      console.error('Error creating broadcast:', error)
      setIsSending(false)
      setActiveBroadcast(null)
    }
  }

  const handleCancel = async () => {
    if (!activeBroadcast?.id) return
    
    try {
      await fetch('/api/broadcast/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastId: activeBroadcast.id })
      })
    } catch (error) {
      console.error('Error cancelling broadcast:', error)
    }
  }

  const insertFormatting = (type: string) => {
    const formats: Record<string, string> = {
      bold: '*text*',
      italic: '_text_',
      link: '[text](url)',
    }
    setMessage(prev => prev + formats[type])
  }

  const progressPercent = broadcastProgress.total > 0 
    ? Math.round(((broadcastProgress.delivered + broadcastProgress.failed) / broadcastProgress.total) * 100)
    : 0

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
          <h1 className="text-2xl font-bold text-white">Broadcast</h1>
          <p className="text-gray-400 mt-1">Send messages to your users</p>
        </div>
        <GlassButton variant="secondary" onClick={loadData}>
          <RefreshCw size={18} />
          <span className="ml-2">Refresh</span>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6" delay={0}>
            <h3 className="text-lg font-semibold text-white mb-4">Select Target</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {targets.map((target) => {
                const isSelected = selectedTarget === target.id
                
                return (
                  <motion.button
                    key={target.id}
                    onClick={() => !isSending && setSelectedTarget(target.id)}
                    disabled={isSending}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-gradient-to-br from-accent-cyan/20 to-accent-blue/10 border-accent-cyan/50'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
                    } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileHover={!isSending ? { scale: 1.02 } : {}}
                    whileTap={!isSending ? { scale: 0.98 } : {}}
                  >
                    <Users size={20} className={isSelected ? 'text-accent-cyan' : 'text-gray-400'} />
                    <p className={`mt-2 text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {target.label}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-accent-cyan' : 'text-gray-500'}`}>
                      {target.count.toLocaleString()} users
                    </p>
                  </motion.button>
                )
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-6" delay={0.1}>
            <h3 className="text-lg font-semibold text-white mb-4">Compose Message</h3>
            
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <button
                onClick={() => insertFormatting('bold')}
                disabled={isSending}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
              >
                <Bold size={18} />
              </button>
              <button
                onClick={() => insertFormatting('italic')}
                disabled={isSending}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
              >
                <Italic size={18} />
              </button>
              <button
                onClick={() => insertFormatting('link')}
                disabled={isSending}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
              >
                <Link size={18} />
              </button>
              <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]" />
              <button
                disabled={isSending}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50"
              >
                <Image size={18} />
              </button>
            </div>

            <GlassTextarea
              placeholder="Write your message here... Use *bold*, _italic_, and [links](url) for formatting."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={isSending}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{message.length} characters</span>
                {selectedTargetData && (
                  <span>Sending to {selectedTargetData.count.toLocaleString()} recipients</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <GlassButton 
                  variant="secondary" 
                  onClick={() => setShowPreview(true)}
                  disabled={!message.trim() || isSending}
                >
                  <Eye size={18} />
                  <span className="ml-2">Preview</span>
                </GlassButton>
                <GlassButton 
                  onClick={handleSend}
                  disabled={!message.trim() || isSending}
                >
                  <Send size={18} />
                  <span className="ml-2">{isSending ? 'Sending...' : 'Send Broadcast'}</span>
                </GlassButton>
              </div>
            </div>
          </GlassCard>

          {isSending && (
            <GlassCard className="p-6" delay={0}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center relative">
                    <Send size={28} className="text-accent-cyan" />
                    <motion.div 
                      className="absolute inset-0 rounded-xl border-2 border-accent-cyan/50"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Broadcasting in Progress</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Sending to {broadcastProgress.total.toLocaleString()} recipients
                    </p>
                  </div>
                </div>
                <GlassButton variant="danger" onClick={handleCancel}>
                  <X size={18} />
                  <span className="ml-2">Cancel Broadcast</span>
                </GlassButton>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{progressPercent}%</span>
                </div>
                <div className="relative h-4 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-cyan to-accent-blue rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                  <p className="text-2xl font-bold text-white">{broadcastProgress.sent.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Sent</p>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(34,197,94,0.05)] border border-green-500/20 text-center">
                  <p className="text-2xl font-bold text-green-400">{broadcastProgress.delivered.toLocaleString()}</p>
                  <p className="text-xs text-green-400/70 mt-1">Delivered</p>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
                  <p className="text-2xl font-bold text-yellow-400">{(broadcastProgress.total - broadcastProgress.sent).toLocaleString()}</p>
                  <p className="text-xs text-yellow-400/70 mt-1">Pending</p>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(239,68,68,0.05)] border border-red-500/20 text-center">
                  <p className="text-2xl font-bold text-red-400">{broadcastProgress.failed.toLocaleString()}</p>
                  <p className="text-xs text-red-400/70 mt-1">Failed/Blocked</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
                <Clock size={14} />
                <span>Estimated time: ~{Math.max(1, Math.ceil((broadcastProgress.total - broadcastProgress.sent) * 0.05 / 60))} min remaining</span>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6" delay={0.2}>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Broadcasts</h3>
            
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No broadcasts yet</p>
              ) : (
                history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"
                  >
                    <p className="text-sm text-white line-clamp-2 mb-2">{item.message}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <span>{item.target}</span>
                      <span>-</span>
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle size={12} />
                        <span>{(item.delivered || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-400">
                        <XCircle size={12} />
                        <span>{(item.failed || 0).toLocaleString()}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${
                        item.status === 'completed' ? 'text-green-400' : 
                        item.status === 'cancelled' ? 'text-yellow-400' : 
                        item.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        <Clock size={12} />
                        <span className="capitalize">{item.status || 'completed'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6" delay={0.3}>
            <h3 className="text-lg font-semibold text-white mb-4">Tips</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-accent-cyan">-</span>
                Use *asterisks* for bold text
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-cyan">-</span>
                Use _underscores_ for italic
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-cyan">-</span>
                Add [text](url) for hyperlinks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-cyan">-</span>
                Target active users for better engagement
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Message Preview"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)]">
            <p className="text-white whitespace-pre-wrap">{message}</p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Target: {selectedTargetData?.label}</span>
            <span>Recipients: {selectedTargetData?.count.toLocaleString()}</span>
          </div>

          <GlassButton className="w-full" onClick={() => { setShowPreview(false); handleSend(); }}>
            <Send size={18} />
            <span className="ml-2">Send Now</span>
          </GlassButton>
        </div>
      </Modal>
    </div>
  )
}
