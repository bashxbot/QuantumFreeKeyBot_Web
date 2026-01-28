import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { ToastProvider } from '@/components/ui'
import { Dashboard, Keys, Users, Games, Broadcast, Settings, Support, Login, Admins } from '@/pages'
import { useState, useEffect } from 'react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem('isAdminAuthenticated')
    setIsAuthenticated(auth === 'true')
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return <div className="min-h-screen bg-black" />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ToastProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/keys" element={<Keys />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/broadcast" element={<Broadcast />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/admins" element={<Admins />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ToastProvider>
  )
}

export default App