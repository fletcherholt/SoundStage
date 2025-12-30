import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  HardDrive, 
  Home,
  ArrowLeft,
  Film,
  Tv,
  Music,
  Image,
  Check,
  AlertCircle
} from 'lucide-react'

const libraryTypes = [
  { id: 'movies', label: 'Movies', icon: Film, description: 'Feature films and documentaries' },
  { id: 'tvshows', label: 'TV Shows', icon: Tv, description: 'Series with episodes and seasons' },
  { id: 'music', label: 'Music', icon: Music, description: 'Albums, artists, and tracks' },
  { id: 'photos', label: 'Photos', icon: Image, description: 'Image galleries' }
]

export default function AddLibrary() {
  const { user, setHasLibraries } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [libraryName, setLibraryName] = useState('')
  const [libraryType, setLibraryType] = useState('')
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [volumes, setVolumes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchVolumes()
  }, [])

  const fetchVolumes = async () => {
    try {
      const { data } = await api.get('/library/volumes')
      setVolumes(data)
    } catch (error) {
      console.error('Failed to fetch volumes:', error)
    }
  }

  const browsePath = async (path) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/library/browse?path=${encodeURIComponent(path)}`)
      setCurrentPath(data.currentPath)
      setParentPath(data.parentPath)
      setEntries(data.entries)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to browse directory')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFolder = (folderPath) => {
    browsePath(folderPath)
  }

  const handleConfirmPath = () => {
    setStep(2)
  }

  const handleSelectType = (type) => {
    setLibraryType(type)
    setLibraryName(type.charAt(0).toUpperCase() + type.slice(1))
    setStep(3)
  }

  const handleCreateLibrary = async () => {
    if (!libraryName || !libraryType || !currentPath) {
      setError('Please complete all steps')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.post('/library', {
        name: libraryName,
        path: currentPath,
        type: libraryType
      })
      setSuccess(true)
      setHasLibraries(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create library')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-scale-in">
        <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-800">
          <Check className="text-white" size={44} />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-3">Library Added!</h1>
        <p className="text-neutral-500 mb-4 text-lg">
          Soundstage is now scanning your media files. This may take a few minutes.
        </p>
        <p className="text-neutral-600 text-sm">Redirecting to home...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-all mb-4 hover:-translate-x-1"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="text-3xl font-semibold text-white">Add Media Library</h1>
        <p className="text-neutral-500 mt-2 text-lg">
          Select a folder containing your media files
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold transition-all duration-300 ${
              step >= s 
                ? 'bg-white text-black' 
                : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
            }`}>
              {step > s ? <Check size={18} /> : s}
            </div>
            {s < 3 && (
              <div className={`w-20 h-1 rounded-full transition-all duration-500 ${step > s ? 'bg-white' : 'bg-neutral-900'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-6 animate-fade-in-down">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select folder */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in-up">
          <h2 className="text-xl font-semibold text-white">Select Folder</h2>
          
          {/* Quick access volumes */}
          {!currentPath && volumes.length > 0 && (
            <div className="grid gap-3">
              {volumes.map((vol) => (
                <button
                  key={vol.path}
                  onClick={() => handleSelectFolder(vol.path)}
                  className="flex items-center gap-4 p-5 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-all text-left border border-neutral-800 hover:border-neutral-700 group"
                >
                  {vol.type === 'home' ? (
                    <div className="p-2 bg-neutral-800 rounded-lg group-hover:bg-neutral-700 transition-colors">
                      <Home className="text-white" size={22} />
                    </div>
                  ) : (
                    <div className="p-2 bg-neutral-800 rounded-lg group-hover:bg-neutral-700 transition-colors">
                      <HardDrive className="text-white" size={22} />
                    </div>
                  )}
                  <span className="text-white font-medium text-lg">{vol.name}</span>
                  <ChevronRight className="text-neutral-600 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                </button>
              ))}
            </div>
          )}

          {/* Folder browser */}
          {currentPath && (
            <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              {/* Current path */}
              <div className="flex items-center gap-3 p-4 border-b border-neutral-800 bg-neutral-950">
                <Folder className="text-white" size={20} />
                <span className="text-neutral-400 text-sm truncate flex-1 font-mono">{currentPath}</span>
              </div>

              {/* Parent folder */}
              {parentPath !== currentPath && (
                <button
                  onClick={() => browsePath(parentPath)}
                  className="flex items-center gap-3 p-4 w-full hover:bg-neutral-800 transition-colors border-b border-neutral-800 group"
                >
                  <ArrowLeft className="text-neutral-600 group-hover:text-white transition-colors" size={18} />
                  <span className="text-neutral-500 group-hover:text-white transition-colors">..</span>
                </button>
              )}

              {/* Folders */}
              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-neutral-500">Loading...</div>
                ) : entries.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500">No subfolders</div>
                ) : (
                  entries.map((entry) => (
                    <button
                      key={entry.path}
                      onClick={() => handleSelectFolder(entry.path)}
                      className="flex items-center gap-3 p-4 w-full hover:bg-neutral-800 transition-colors border-b border-neutral-800/50 last:border-0 group"
                    >
                      <FolderOpen className="text-neutral-500" size={20} />
                      <span className="text-white truncate group-hover:text-neutral-300 transition-colors">{entry.name}</span>
                      <ChevronRight className="text-neutral-700 ml-auto flex-shrink-0 group-hover:text-white group-hover:translate-x-1 transition-all" size={18} />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Confirm button */}
          {currentPath && (
            <button
              onClick={handleConfirmPath}
              className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition-all"
            >
              Use This Folder
            </button>
          )}
        </div>
      )}

      {/* Step 2: Select type */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in-up">
          <h2 className="text-xl font-semibold text-white">Select Library Type</h2>
          <p className="text-neutral-500">What type of media is in this folder?</p>
          
          <div className="grid gap-4">
            {libraryTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                className="flex items-center gap-5 p-5 bg-neutral-900 rounded-lg hover:bg-neutral-800 hover:border-neutral-600 border border-neutral-800 transition-all text-left group"
              >
                <div className="p-4 bg-neutral-800 rounded-lg group-hover:bg-neutral-700 transition-colors">
                  <type.icon className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg group-hover:text-neutral-300 transition-colors">{type.label}</h3>
                  <p className="text-neutral-500">{type.description}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 hover:-translate-x-1"
          >
            <ArrowLeft size={16} />
            Change folder
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          <h2 className="text-xl font-semibold text-white">Confirm Library</h2>
          
          <div className="bg-neutral-900 rounded-lg p-6 space-y-5 border border-neutral-800">
            <div>
              <label className="block text-sm text-neutral-500 mb-2 font-medium">Library Name</label>
              <input
                type="text"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-white transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm text-neutral-500 mb-2 font-medium">Type</label>
              <p className="text-white capitalize text-lg">{libraryType}</p>
            </div>
            
            <div>
              <label className="block text-sm text-neutral-500 mb-2 font-medium">Path</label>
              <p className="text-white text-sm break-all font-mono bg-neutral-950 p-3 rounded-lg">{currentPath}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-all border border-neutral-800 hover:border-neutral-700"
            >
              Back
            </button>
            <button
              onClick={handleCreateLibrary}
              disabled={loading || !libraryName}
              className="flex-1 py-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Add Library'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
