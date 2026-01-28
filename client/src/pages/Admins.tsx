import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  Key
} from 'lucide-react'
import {
  GlassCard,
  GlassButton,
  GlassInput,
  Modal,
  StatCard
} from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Admin {
  id: string
  username: string
  name: string
  isActive: boolean
  createdAt: number
  lastLogin?: number
}

export function Admins() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isDefaultAdmin, setIsDefaultAdmin] = useState(false)

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', name: '' })
  const [editAdmin, setEditAdmin] = useState({ name: '', password: '', isActive: true })
  const [passwordChange, setPasswordChange] = useState({ current: '', new: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const adminAuth = localStorage.getItem('isAdminAuthenticated')
    const defaultAdmin = localStorage.getItem('isDefaultAdmin')
    setIsDefaultAdmin(adminAuth === 'true' && defaultAdmin === 'true')
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      const response = await fetch('/api/admins')
      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
      }
    } catch (error) {
      console.error('Error loading admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) {
      setError('Username and password are required')
      return
    }
    if (newAdmin.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setAdmins([...admins, data.admin])
        setShowAddModal(false)
        setNewAdmin({ username: '', password: '', name: '' })
        setSuccess('Admin added successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to add admin')
      }
    } catch (error) {
      setError('Failed to add admin')
    }
  }

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return

    try {
      const response = await fetch(`/api/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAdmin)
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setAdmins(admins.map(a => 
          a.id === selectedAdmin.id 
            ? { ...a, name: editAdmin.name || a.name, isActive: editAdmin.isActive }
            : a
        ))
        setShowEditModal(false)
        setSelectedAdmin(null)
        setSuccess('Admin updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update admin')
      }
    } catch (error) {
      setError('Failed to update admin')
    }
  }

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return

    try {
      const response = await fetch(`/api/admins/${selectedAdmin.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setAdmins(admins.filter(a => a.id !== selectedAdmin.id))
        setShowDeleteModal(false)
        setSelectedAdmin(null)
        setSuccess('Admin deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to delete admin')
      }
    } catch (error) {
      setError('Failed to delete admin')
    }
  }

  const handleChangePassword = async () => {
    if (passwordChange.new !== passwordChange.confirm) {
      setError('Passwords do not match')
      return
    }
    if (passwordChange.new.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordChange.current,
          newPassword: passwordChange.new
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setShowPasswordModal(false)
        setPasswordChange({ current: '', new: '', confirm: '' })
        setSuccess('Password changed successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setError('Failed to change password')
    }
  }

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin)
    setEditAdmin({ name: admin.name, password: '', isActive: admin.isActive })
    setShowEditModal(true)
  }

  const openDeleteModal = (admin: Admin) => {
    setSelectedAdmin(admin)
    setShowDeleteModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Management</h1>
          <p className="text-gray-400 mt-1">Manage web dashboard administrators</p>
        </div>
        {isDefaultAdmin && (
          <div className="flex gap-3">
            <GlassButton variant="secondary" onClick={() => setShowPasswordModal(true)}>
              <Key size={18} />
              <span className="ml-2">Change Password</span>
            </GlassButton>
            <GlassButton onClick={() => setShowAddModal(true)}>
              <UserPlus size={18} />
              <span className="ml-2">Add Admin</span>
            </GlassButton>
          </div>
        )}
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400"
        >
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400"
        >
          {error}
          <button onClick={() => setError('')} className="float-right">
            <X size={18} />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Admins"
          value={admins.length}
          icon={<Shield size={22} />}
          color="cyan"
          delay={0}
        />
        <StatCard
          title="Active Admins"
          value={admins.filter(a => a.isActive).length}
          icon={<Check size={22} />}
          color="green"
          delay={0.1}
        />
        <StatCard
          title="Inactive Admins"
          value={admins.filter(a => !a.isActive).length}
          icon={<X size={22} />}
          color="red"
          delay={0.2}
        />
      </div>

      <GlassCard className="p-6" delay={0.3}>
        <h3 className="text-lg font-semibold text-white mb-6">All Administrators</h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No administrators added yet. Only the default admin can access the dashboard.
          </div>
        ) : (
          <div className="space-y-4">
            {admins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
                    <Shield className="text-accent-cyan" size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{admin.name}</p>
                    <p className="text-sm text-gray-400">@{admin.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    admin.isActive 
                      ? 'bg-green-400/10 text-green-400' 
                      : 'bg-red-400/10 text-red-400'
                  }`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Added {formatDate(admin.createdAt)}
                  </span>
                  
                  {isDefaultAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(admin)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(admin)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {!isDefaultAdmin && (
        <GlassCard className="p-6" delay={0.4}>
          <div className="text-center py-4">
            <Shield className="mx-auto text-gray-500 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">Limited Access</h3>
            <p className="text-gray-400">
              Only the default administrator can add or manage other admins.
            </p>
          </div>
        </GlassCard>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setError(''); }}
        title="Add New Admin"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Username</label>
            <GlassInput
              placeholder="Enter username"
              value={newAdmin.username}
              onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Display Name</label>
            <GlassInput
              placeholder="Enter display name (optional)"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <div className="relative">
              <GlassInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (min 6 characters)"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton className="flex-1" onClick={handleAddAdmin}>
              Add Admin
            </GlassButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setError(''); }}
        title="Edit Admin"
        size="md"
      >
        {selectedAdmin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Display Name</label>
              <GlassInput
                placeholder="Enter display name"
                value={editAdmin.name}
                onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">New Password (leave empty to keep current)</label>
              <GlassInput
                type="password"
                placeholder="Enter new password"
                value={editAdmin.password}
                onChange={(e) => setEditAdmin({ ...editAdmin, password: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <span className="text-white">Active Status</span>
              <button
                onClick={() => setEditAdmin({ ...editAdmin, isActive: !editAdmin.isActive })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  editAdmin.isActive ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  editAdmin.isActive ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex gap-3 pt-4">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton className="flex-1" onClick={handleEditAdmin}>
                Save Changes
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Admin"
        size="sm"
      >
        {selectedAdmin && (
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">{selectedAdmin.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="danger" className="flex-1" onClick={handleDeleteAdmin}>
                Delete
              </GlassButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setError(''); }}
        title="Change Default Admin Password"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Current Password</label>
            <GlassInput
              type="password"
              placeholder="Enter current password"
              value={passwordChange.current}
              onChange={(e) => setPasswordChange({ ...passwordChange, current: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">New Password</label>
            <GlassInput
              type="password"
              placeholder="Enter new password"
              value={passwordChange.new}
              onChange={(e) => setPasswordChange({ ...passwordChange, new: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
            <GlassInput
              type="password"
              placeholder="Confirm new password"
              value={passwordChange.confirm}
              onChange={(e) => setPasswordChange({ ...passwordChange, confirm: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton className="flex-1" onClick={handleChangePassword}>
              Change Password
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
