import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Camera, X, Check, Play } from 'lucide-react'

// Color palette for default avatars - gradient theme
const avatarColors = [
  'from-purple-600 to-blue-500',
  'from-purple-700 to-indigo-600',
  'from-indigo-600 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-blue-600 to-teal-500',
  'from-violet-600 to-purple-500',
  'from-indigo-500 to-blue-500',
  'from-cyan-600 to-blue-500',
]

export default function ProfileSelect() {
  const { profiles, selectProfile, createProfile, updateProfile, deleteProfile } = useAuth()
  const [isManaging, setIsManaging] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSelectProfile = async (profile) => {
    if (isManaging) {
      setEditingProfile(profile)
      return
    }
    
    setLoading(true)
    try {
      await selectProfile(profile.id)
    } catch (error) {
      console.error('Failed to select profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvatarColor = (index) => {
    return avatarColors[index % avatarColors.length]
  }

  return (
    <div className="min-h-screen bg-[#101928] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Logo */}
      <div className="mb-16 text-center animate-fade-in relative z-10">
        <img 
          src="/api/logos/Soundstage%20logo.png" 
          alt="Soundstage" 
          className="h-14 mx-auto"
        />
      </div>

      {/* Title */}
      <h2 className="text-2xl text-white/70 mb-10 animate-fade-in relative z-10 font-light" style={{ animationDelay: '0.1s' }}>
        {isManaging ? 'Manage Profiles' : "Who's watching?"}
      </h2>

      {/* Profiles grid */}
      <div className="flex flex-wrap justify-center gap-8 mb-12 max-w-4xl relative z-10">
        {profiles.map((profile, index) => (
          <button
            key={profile.id}
            onClick={() => handleSelectProfile(profile)}
            disabled={loading}
            className="group flex flex-col items-center gap-4 disabled:opacity-50 animate-fade-in-up transition-transform hover:scale-105"
            style={{ animationDelay: `${0.1 + index * 0.1}s` }}
          >
            <div className="relative">
              {/* Avatar */}
              <div className={`w-36 h-36 rounded-xl overflow-hidden border-2 border-transparent group-hover:border-[#00a4dc] group-hover:shadow-[0_0_20px_rgba(0,164,220,0.3)] transition-all duration-300 ${!profile.avatarPath ? `bg-gradient-to-br ${getAvatarColor(index)}` : 'bg-[#1c2a3f]'}`}>
                {profile.avatarPath ? (
                  <img 
                    src={profile.avatarPath} 
                    alt={profile.displayName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl font-semibold text-white">
                      {profile.displayName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Edit overlay when managing */}
              {isManaging && (
                <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                  <Edit2 className="text-white" size={32} />
                </div>
              )}
            </div>
            
            {/* Name */}
            <span className="text-white/60 group-hover:text-white transition-colors font-medium text-lg">
              {profile.displayName}
            </span>
          </button>
        ))}

        {/* Add profile button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="group flex flex-col items-center gap-4 animate-fade-in-up transition-transform hover:scale-105"
          style={{ animationDelay: `${0.1 + profiles.length * 0.1}s` }}
        >
          <div className="w-36 h-36 rounded-xl border-2 border-white/20 border-dashed flex items-center justify-center group-hover:border-[#00a4dc] group-hover:bg-[#00a4dc]/10 transition-all duration-300">
            <Plus className="text-white/40 group-hover:text-[#00a4dc] transition-colors" size={52} />
          </div>
          <span className="text-white/60 group-hover:text-white transition-colors font-medium text-lg">Add Profile</span>
        </button>
      </div>

      {/* Manage profiles button */}
      {profiles.length > 0 && (
        <button
          onClick={() => setIsManaging(!isManaging)}
          className={`px-8 py-3 rounded-lg transition-all duration-300 font-medium relative z-10 animate-fade-in ${
            isManaging 
              ? 'bg-[#00a4dc] text-white' 
              : 'border border-white/30 text-white/60 hover:border-white hover:text-white'
          }`}
          style={{ animationDelay: '0.5s' }}
        >
          {isManaging ? 'Done' : 'Manage Profiles'}
        </button>
      )}

      {/* Create/Edit Profile Modal */}
      {(showCreateModal || editingProfile) && (
        <ProfileModal
          profile={editingProfile}
          onClose={() => {
            setShowCreateModal(false)
            setEditingProfile(null)
          }}
          onSave={async (name, avatarFile) => {
            if (editingProfile) {
              await updateProfile(editingProfile.id, name, avatarFile)
            } else {
              await createProfile(name, avatarFile)
            }
            setShowCreateModal(false)
            setEditingProfile(null)
          }}
          onDelete={editingProfile ? async () => {
            await deleteProfile(editingProfile.id)
            setEditingProfile(null)
          } : null}
        />
      )}
    </div>
  )
}

function ProfileModal({ profile, onClose, onSave, onDelete }) {
  const [name, setName] = useState(profile?.displayName || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarPath || null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef(null)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    
    setLoading(true)
    try {
      await onSave(name.trim(), avatarFile)
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#1c2a3f] rounded-xl p-8 max-w-md w-full relative animate-scale-in border border-white/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold text-white mb-6">
          {profile ? 'Edit Profile' : 'Create Profile'}
        </h2>

        {/* Avatar upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-36 h-36 rounded-xl overflow-hidden bg-[#243349] border-2 border-white/20 hover:border-[#00a4dc] transition-all duration-300 group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/40 group-hover:text-white transition-colors">
                  <Camera size={36} />
                  <span className="text-sm mt-2 font-medium">Add Photo</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {avatarPreview && (
              <button
                onClick={() => {
                  setAvatarFile(null)
                  setAvatarPreview(null)
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-8">
          <label className="block text-sm text-white/50 mb-2 font-medium">Profile Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="w-full px-4 py-3 bg-[#243349] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00a4dc] transition-all"
            autoFocus
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-3 bg-[#243349] hover:bg-red-600 text-white/50 hover:text-white rounded-lg transition-all duration-200"
            >
              <Trash2 size={20} />
            </button>
          )}
          
          {showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-[#243349] hover:bg-[#2a3a52] text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Profile'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#243349] hover:bg-[#2a3a52] text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || loading}
                className="flex-1 py-3 bg-[#00a4dc] hover:bg-[#00b4ec] text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Saving...'
                ) : (
                  <>
                    <Check size={20} />
                    Save
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
