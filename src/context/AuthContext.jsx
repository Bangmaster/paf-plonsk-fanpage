import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const ADMIN_LOGIN = 'Joker'
const ADMIN_PASSWORD_KEY = 'paf_admin_password'
const DEFAULT_PASSWORD = 'Twojastara'

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('paf_admin') === 'true'
  })

  function login(username, password) {
    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD
    if (username === ADMIN_LOGIN && password === storedPassword) {
      sessionStorage.setItem('paf_admin', 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  function logout() {
    sessionStorage.removeItem('paf_admin')
    setIsAdmin(false)
  }

  function changePassword(oldPassword, newPassword) {
    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD
    if (oldPassword === storedPassword) {
      localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword)
      return true
    }
    return false
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
