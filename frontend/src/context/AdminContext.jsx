import { createContext, useContext, useState } from 'react'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const t = localStorage.getItem('dn-admin-token')
      const u = localStorage.getItem('dn-admin-user')
      return t ? { token: t, user: JSON.parse(u) } : null
    } catch { return null }
  })

  function login(token, user) {
    localStorage.setItem('dn-admin-token', token)
    localStorage.setItem('dn-admin-user', JSON.stringify(user))
    setAdmin({ token, user })
  }

  function logout() {
    localStorage.removeItem('dn-admin-token')
    localStorage.removeItem('dn-admin-user')
    setAdmin(null)
  }

  return (
    <AdminContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}