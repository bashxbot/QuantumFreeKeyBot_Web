
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, LogIn, User } from 'lucide-react'
import { GlassCard, GlassButton, GlassInput } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

export function Login() {
  const [loginMode, setLoginMode] = useState<'default' | 'admin'>('default')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const apiUrl = window.location.origin
      const endpoint = loginMode === 'default' 
        ? `${apiUrl}/api/auth/login`
        : `${apiUrl}/api/auth/admin-login`
      
      const body = loginMode === 'default' 
        ? { password }
        : { username, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('isAdminAuthenticated', 'true')
        localStorage.setItem('isDefaultAdmin', loginMode === 'default' ? 'true' : 'false')
        if (data.adminId) {
          localStorage.setItem('adminId', data.adminId)
        }
        navigate('/')
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Failed to authenticate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-blue items-center justify-center mb-4">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-gray-400">Enter your password to continue</p>
        </div>

        <GlassCard className="p-8">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('default'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                loginMode === 'default'
                  ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white'
                  : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
              }`}
            >
              Default Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('admin'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                loginMode === 'admin'
                  ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white'
                  : 'bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white'
              }`}
            >
              Sub-Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginMode === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <GlassInput
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <GlassInput
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <GlassButton
              type="submit"
              className="w-full"
              disabled={loading}
            >
              <LogIn size={18} />
              <span className="ml-2">{loading ? 'Logging in...' : 'Login'}</span>
            </GlassButton>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
