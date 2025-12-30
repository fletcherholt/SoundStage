import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { 
  Settings as SettingsIcon, 
  User, 
  FolderOpen, 
  Server,
  Trash2,
  RefreshCw,
  Plus,
  Shield,
  Camera,
  Check,
  Key,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Settings() {
  const { user, profiles, updateProfile } = useAuth()
  const [libraries, setLibraries] = useState([])
  const [serverInfo, setServerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Profile editing state
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef(null)

  // TMDB settings
  const [tmdbApiKey, setTmdbApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [savingTmdb, setSavingTmdb] = useState(false)
  const [tmdbStatus, setTmdbStatus] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    setNewName(user?.displayName || '')
  }, [user])

  const fetchSettings = async () => {
    try {
      const [libRes, serverRes, settingsRes] = await Promise.all([
        api.get('/library'),
        api.get('/settings/server'),
        api.get('/settings')
      ])
      setLibraries(libRes.data)
      setServerInfo(serverRes.data)
      // Check if TMDB key is configured
      if (settingsRes.data.tmdb_api_key) {
        setTmdbApiKey(settingsRes.data.tmdb_api_key)
        setTmdbStatus('configured')
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRescanLibrary = async (libraryId) => {
    try {
      await api.post(`/library/${libraryId}/scan`)
      alert('Scan started. This may take a few minutes.')
    } catch (error) {
      alert('Failed to start scan')
    }
  }

  const handleDeleteLibrary = async (libraryId) => {
    if (!confirm('Are you sure you want to delete this library? All media metadata will be removed.')) {
      return
    }

    try {
      await api.delete(`/library/${libraryId}`)
      setLibraries(libraries.filter(l => l.id !== libraryId))
    } catch (error) {
      alert('Failed to delete library')
    }
  }

  const handleSaveTmdbKey = async () => {
    if (!tmdbApiKey.trim()) return

    setSavingTmdb(true)
    try {
      await api.put('/settings/tmdb_api_key', { value: tmdbApiKey.trim() })
      setTmdbStatus('configured')
      alert('TMDB API key saved. Rescan your libraries to fetch metadata.')
    } catch (error) {
      alert('Failed to save API key')
    } finally {
      setSavingTmdb(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSavingProfile(true)
    try {
      await updateProfile(user.id, null, file)
    } catch (error) {
      alert('Failed to update avatar')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName === user?.displayName) {
      setEditingName(false)
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile(user.id, newName.trim(), null)
      setEditingName(false)
    } catch (error) {
      alert('Failed to update name')
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-neutral-900 rounded skeleton"></div>
        <div className="h-32 bg-neutral-900 rounded-lg skeleton"></div>
        <div className="h-48 bg-neutral-900 rounded-lg skeleton"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
          <SettingsIcon className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white">Settings</h1>
          <p className="text-neutral-500">Manage your profile and server</p>
        </div>
      </div>

      {/* Profile Settings */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center gap-3 mb-6">
          <User className="text-white" size={22} />
          <h2 className="text-xl font-semibold text-white">Your Profile</h2>
        </div>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={savingProfile}
              className="w-28 h-28 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center group hover:bg-neutral-700 transition-all disabled:opacity-50 border border-neutral-700"
            >
              {user?.avatarPath ? (
                <img 
                  src={user.avatarPath} 
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-white">
                  {user?.displayName?.[0]?.toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="text-white" size={24} />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="flex-1">
            <label className="block text-sm text-neutral-500 mb-2">Display Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-white transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingProfile}
                  className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg transition-all disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-white text-lg hover:text-neutral-300 transition-colors"
              >
                {user?.displayName}
              </button>
            )}
            <p className="text-neutral-600 text-sm mt-2">
              {user?.isAdmin ? 'Administrator' : 'User'} • Click to edit
            </p>
          </div>
        </div>
      </section>

      {/* Server Info */}
      {serverInfo && (
        <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
          <div className="flex items-center gap-3 mb-5">
            <Server className="text-white" size={22} />
            <h2 className="text-xl font-semibold text-white">Server Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-5 text-sm">
            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
              <p className="text-neutral-500 mb-1">Server Name</p>
              <p className="text-white font-medium">{serverInfo.name}</p>
            </div>
            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
              <p className="text-neutral-500 mb-1">Version</p>
              <p className="text-white font-medium">{serverInfo.version}</p>
            </div>
            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
              <p className="text-neutral-500 mb-1">Platform</p>
              <p className="text-white font-medium capitalize">{serverInfo.platform}</p>
            </div>
            <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
              <p className="text-neutral-500 mb-1">Node.js</p>
              <p className="text-white font-medium">{serverInfo.nodeVersion}</p>
            </div>
          </div>
        </section>
      )}

      {/* TMDB Settings (admin only) */}
      {user?.isAdmin && (
        <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
          <div className="flex items-center gap-3 mb-5">
            <Key className="text-white" size={22} />
            <h2 className="text-xl font-semibold text-white">Metadata Provider</h2>
          </div>

          <div className="space-y-4">
            <p className="text-neutral-400 text-sm">
              To fetch movie and TV show metadata, you need a free TMDB API key.
            </p>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={tmdbApiKey}
                  onChange={(e) => setTmdbApiKey(e.target.value)}
                  placeholder="Enter your TMDB API key"
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:border-white focus:outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleSaveTmdbKey}
                disabled={savingTmdb || !tmdbApiKey.trim()}
                className="px-6 py-3 bg-white hover:bg-neutral-200 text-black font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {savingTmdb ? 'Saving...' : 'Save'}
              </button>
            </div>

            {tmdbStatus === 'configured' && (
              <p className="text-green-500 text-sm flex items-center gap-2">
                <Check size={16} />
                API key configured. Metadata will be fetched when scanning libraries.
              </p>
            )}

            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Get a free API key from TMDB
              <ExternalLink size={14} />
            </a>
          </div>
        </section>
      )}

      {/* Libraries */}
      <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FolderOpen className="text-white" size={22} />
            <h2 className="text-xl font-semibold text-white">Media Libraries</h2>
          </div>
          {user?.isAdmin && (
            <Link
              to="/add-library"
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg transition-all text-sm font-medium"
            >
              <Plus size={18} />
              Add Library
            </Link>
          )}
        </div>

        {libraries.length === 0 ? (
          <p className="text-neutral-500 text-center py-10">No libraries configured</p>
        ) : (
          <div className="space-y-3">
            {libraries.map((library) => (
              <div 
                key={library.id}
                className="flex items-center justify-between p-5 bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-all group border border-neutral-800"
              >
                <div>
                  <h3 className="text-white font-medium">{library.name}</h3>
                  <p className="text-neutral-500 text-sm">{library.path}</p>
                  <p className="text-neutral-600 text-xs mt-1">
                    Type: {library.type} • Last scan: {library.last_scan ? new Date(library.last_scan).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                {user?.isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRescanLibrary(library.id)}
                      className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all"
                      title="Rescan library"
                    >
                      <RefreshCw className="text-neutral-400" size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteLibrary(library.id)}
                      className="p-2.5 bg-neutral-800 hover:bg-red-600 rounded-lg transition-all"
                      title="Delete library"
                    >
                      <Trash2 className="text-neutral-400" size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All Profiles (admin only) */}
      {user?.isAdmin && profiles.length > 0 && (
        <section className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
          <div className="flex items-center gap-3 mb-5">
            <User className="text-white" size={22} />
            <h2 className="text-xl font-semibold text-white">All Profiles</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className="flex flex-col items-center p-5 bg-neutral-950 rounded-lg hover:bg-neutral-800 transition-all group border border-neutral-800"
              >
                <div className="w-18 h-18 rounded-lg overflow-hidden bg-neutral-800 flex items-center justify-center mb-3 group-hover:bg-neutral-700 transition-all border border-neutral-700">
                  {profile.avatarPath ? (
                    <img 
                      src={profile.avatarPath} 
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {profile.displayName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-medium">{profile.displayName}</h3>
                {profile.isAdmin && (
                  <span className="flex items-center gap-1 text-neutral-400 text-xs mt-1">
                    <Shield size={12} />
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
