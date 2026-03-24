import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const access = localStorage.getItem('access')
    if (access) {
      setIsAuthenticated(true)
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)) } catch {}
      }
    }
  }, [])

  async function login(email, password) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      const userData = data.user || null
      if (userData) localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      setIsAuthenticated(true)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function register(username, email, password, telegram_chat_id = '', telegram_handle = '') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, telegram_chat_id, telegram_handle })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        let msg = 'Registration failed'
        if (data?.detail) {
          msg = data.detail
        } else if (data && typeof data === 'object') {
          const messages = Object.entries(data)
            .map(([field, errs]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${Array.isArray(errs) ? errs.join(' ') : errs}`)
          if (messages.length) msg = messages.join(' | ')
        }
        throw new Error(msg)
      }
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    // Attempt to blacklist the refresh token (fire-and-forget)
    const refresh = localStorage.getItem('refresh')
    const access = localStorage.getItem('access')
    if (refresh && access) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ refresh })
      }).catch(() => {})
    }
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')
    setUser(null)
    setIsAuthenticated(false)
  }

  const value = { isAuthenticated, user, loading, error, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
