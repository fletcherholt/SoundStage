import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLibraries, setHasLibraries] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check server status
      const { data: status } = await api.get('/auth/status')
      setHasLibraries(status.hasLibraries)

      // Load all profiles
      const { data: profileList } = await api.get('/auth/profiles')
      setProfiles(profileList)

      // Check if user is already logged in
      const token = localStorage.getItem('soundstage_token')
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        try {
          const { data: userData } = await api.get('/auth/me')
          setUser(userData)
        } catch (e) {
          // Token invalid, clear it
          localStorage.removeItem('soundstage_token')
          delete api.defaults.headers.common['Authorization']
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectProfile = async (profileId) => {
    const { data } = await api.post('/auth/select-profile', { profileId })
    localStorage.setItem('soundstage_token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data.user)
    return data.user
  }

  const createProfile = async (name, avatarFile) => {
    const formData = new FormData()
    formData.append('name', name)
    if (avatarFile) {
      formData.append('avatar', avatarFile)
    }
    
    const { data } = await api.post('/auth/profiles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    setProfiles([...profiles, data])
    return data
  }

  const updateProfile = async (profileId, name, avatarFile) => {
    const formData = new FormData()
    if (name) formData.append('name', name)
    if (avatarFile) formData.append('avatar', avatarFile)
    
    const { data } = await api.put(`/auth/profiles/${profileId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, ...data } : p))
    if (user?.id === profileId) {
      setUser({ ...user, ...data })
    }
    return data
  }

  const deleteProfile = async (profileId) => {
    await api.delete(`/auth/profiles/${profileId}`)
    setProfiles(profiles.filter(p => p.id !== profileId))
    if (user?.id === profileId) {
      logout()
    }
  }

  const logout = () => {
    localStorage.removeItem('soundstage_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const refreshProfiles = async () => {
    const { data } = await api.get('/auth/profiles')
    setProfiles(data)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profiles,
      loading, 
      hasLibraries,
      setHasLibraries,
      selectProfile,
      createProfile,
      updateProfile,
      deleteProfile,
      logout,
      refreshProfiles
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
