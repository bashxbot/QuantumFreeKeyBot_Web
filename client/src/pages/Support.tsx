import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  HeadphonesIcon,
  Users,
  MessageCircle,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  Send,
  Download
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassInput,
  DataTable,
  Modal,
  StatCard
} from '@/components/ui'
import { formatDateTime, getRelativeTime } from '@/lib/utils'
import { StaffMember, SupportChat, ChatMessage } from '@/lib/types'
import { fetchStaffMembers, fetchSupportChats, getDb, ref, push, set, onValue } from '@/lib/firebase'

const roleColors = {
  support: 'text-green-400 bg-green-400/10',
  moderator: 'text-yellow-400 bg-yellow-400/10',
  admin: 'text-red-400 bg-red-400/10',
}

export function Support() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [chats, setChats] = useState<SupportChat[]>([])
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [newStaffId, setNewStaffId] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staffData, sessionsData] = await Promise.all([
          fetchStaff(),
          fetchSupportSessions()
        ])
        setStaff(staffData)
        setChats(sessionsData)
      } catch (error) {
        console.error('Error loading support data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Real-time listener for support sessions
    let unsubscribe: (() => void) | null = null
    getDb().then((database) => {
      const sessionsRef = ref(database, 'supportSessions')
      unsubscribe = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessions: SupportChat[] = []
        snapshot.forEach((child) => {
          const session = child.val()
          sessions.push({ 
            id: child.key!, 
            oderId: child.key!,
            ...session,
            messages: session.messages ? Object.values(session.messages) : []
          })
        })
        setChats(sessions)
      } else {
        setChats([])
      }
      })
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const stats = {
    totalStaff: staff.length,
    onlineStaff: staff.filter(s => s.isOnline).length,
    activeChats: chats.filter(c => c.status === 'active').length,
    waitingChats: chats.filter(c => c.status === 'waiting').length,
  }

  const handleViewChat = (chat: SupportChat) => {
    setSelectedChat(chat)
    setShowChatModal(true)
  }

  const staffColumns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (item: StaffMember) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
              <span className="text-white font-medium">{item.name[0]}</span>
            </div>
            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-700 ${
              item.isOnline ? 'bg-green-400' : 'bg-gray-500'
            }`} />
          </div>
          <div>
            <p className="font-medium text-white">{item.name}</p>
            <p className="text-sm text-gray-400">@{item.username}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: StaffMember) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium capitalize ${roleColors[item.role]}`}>
          {item.role}
        </span>
      )
    },
    {
      key: 'totalChats',
      header: 'Chats Handled',
      sortable: true,
    },
    {
      key: 'isOnline',
      header: 'Status',
      render: (item: StaffMember) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
          item.isOnline ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'
        }`}>
          {item.isOnline ? <UserCheck size={12} /> : <UserX size={12} />}
          {item.isOnline ? 'Online' : 'Offline'}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (item: StaffMember) => (
        <button 
          onClick={async () => {
            if (confirm(`Remove ${item.name} from staff?`)) {
              try {
                await removeStaffMember(item.id);
                const updatedStaff = await fetchStaff();
                setStaff(updatedStaff);
              } catch (error) {
                console.error('Error removing staff:', error);
                alert('Failed to remove staff member');
              }
            }
          }}
          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff & Support</h1>
          <p className="text-gray-400 mt-1">Manage support staff and live chats</p>
        </div>
        <GlassButton onClick={() => setShowAddStaffModal(true)}>
          <Plus size={18} />
          <span className="ml-2">Add Staff</span>
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          icon={<Users size={22} />}
          color="cyan"
          delay={0}
        />
        <StatCard
          title="Online Now"
          value={stats.onlineStaff}
          icon={<UserCheck size={22} />}
          color="green"
          delay={0.1}
        />
        <StatCard
          title="Active Chats"
          value={stats.activeChats}
          icon={<MessageCircle size={22} />}
          color="blue"
          delay={0.2}
        />
        <StatCard
          title="Waiting"
          value={stats.waitingChats}
          icon={<Clock size={22} />}
          color="orange"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-6" delay={0.4}>
            <h3 className="text-lg font-semibold text-white mb-4">Staff Members</h3>
            <DataTable
              data={staff}
              columns={staffColumns}
              pageSize={10}
              searchPlaceholder="Search staff..."
              emptyMessage="No staff members"
            />
          </GlassCard>
        </div>

        <GlassCard className="p-6" delay={0.5}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
            <GlassButton variant="secondary" size="sm">
              <Download size={16} />
            </GlassButton>
          </div>

          <div className="space-y-3">
            {chats.map((chat) => (
              <motion.div
                key={chat.id}
                className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                onClick={() => handleViewChat(chat)}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">User #{chat.oderId.slice(0, 6)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    chat.status === 'active' ? 'bg-green-400/10 text-green-400' :
                    chat.status === 'waiting' ? 'bg-orange-400/10 text-orange-400' :
                    'bg-gray-400/10 text-gray-400'
                  }`}>
                    {chat.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-1">
                  {chat.messages[chat.messages.length - 1]?.content}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {getRelativeTime(chat.startedAt)}
                </p>
              </motion.div>
            ))}

            {chats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No active sessions
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <Modal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Add Staff Member"
        size="sm"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telegram User ID
            </label>
            <GlassInput
              placeholder="Enter user ID"
              value={newStaffId}
              onChange={(e) => setNewStaffId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              The user must have started the bot to be added as staff
            </p>
          </div>

          <div className="flex gap-3">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setShowAddStaffModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton className="flex-1" onClick={async () => {
              if (!newStaffId.trim()) {
                alert('Please enter a user ID');
                return;
              }
              
              try {
                await addStaffMember(newStaffId, { name: `Staff ${newStaffId.slice(0, 6)}` });
                const updatedStaff = await fetchStaff();
                setStaff(updatedStaff);
                setNewStaffId('');
                setShowAddStaffModal(false);
              } catch (error) {
                console.error('Error adding staff:', error);
                alert('Failed to add staff member');
              }
            }}>
              Add Staff
            </GlassButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title={`Chat with User #${selectedChat?.oderId.slice(0, 6)}`}
        size="lg"
      >
        {selectedChat && (
          <div className="space-y-4">
            <div className="h-[400px] overflow-y-auto space-y-3 p-4 rounded-xl bg-[rgba(0,0,0,0.2)]">
              {selectedChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] p-3 rounded-xl ${
                    msg.isStaff 
                      ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white' 
                      : 'bg-[rgba(255,255,255,0.1)] text-white'
                  }`}>
                    <p className="text-xs opacity-70 mb-1">{msg.senderName}</p>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <GlassInput
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />
              <GlassButton onClick={async () => {
                if (!messageInput.trim() || !selectedChat) return;
                
                try {
                  const messagesRef = ref(db, `supportSessions/${selectedChat.id}/messages`);
                  const newMessageRef = push(messagesRef);
                  await set(newMessageRef, {
                    from: 'staff',
                    message: messageInput,
                    timestamp: Date.now(),
                    isStaff: true,
                    senderName: 'Admin'
                  });
                  
                  setMessageInput('');
                } catch (error) {
                  console.error('Error sending message:', error);
                }
              }}>
                <Send size={18} />
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
