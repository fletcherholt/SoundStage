import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Plus, FolderOpen, ChevronRight, Play } from 'lucide-react'

// Library card component for "My Media" section
function LibraryCard({ library }) {
  const getLibraryImage = () => {
    // Use library backdrop or a default gradient
    if (library.backdropPath) {
      return library.backdropPath
    }
    return null
  }

  return (
    <Link
      to={`/library/${library.id}`}
      className="group relative aspect-video rounded-xl overflow-hidden bg-[#1c2a3f] hover:ring-2 hover:ring-white/30 transition-all"
    >
      {getLibraryImage() ? (
        <img 
          src={getLibraryImage()} 
          alt={library.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1c2a3f] to-[#243349]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <h3 className="text-white text-xl font-semibold drop-shadow-lg">{library.name}</h3>
      </div>
    </Link>
  )
}

// Media card for Continue Watching / Next Up
function MediaCard({ media, showProgress }) {
  const progress = media.watchProgress || 0

  return (
    <Link
      to={`/media/${media.id}`}
      className="group flex-shrink-0 w-44"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1c2a3f] mb-2">
        {media.thumbnailPath || media.posterPath ? (
          <img 
            src={media.thumbnailPath || media.posterPath} 
            alt={media.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1c2a3f] to-[#243349] flex items-center justify-center">
            <span className="text-white/30 text-2xl font-semibold">{media.title?.[0]}</span>
          </div>
        )}
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={20} className="text-black ml-1" fill="black" />
          </div>
        </div>
        
        {/* Progress bar */}
        {showProgress && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div 
              className="h-full bg-[#00a4dc]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <h4 className="text-white text-sm font-medium truncate">{media.title}</h4>
      {media.episodeTitle && (
        <p className="text-white/50 text-xs truncate">{media.episodeTitle}</p>
      )}
    </Link>
  )
}

// Poster card for Next Up section
function PosterCard({ media }) {
  return (
    <Link
      to={`/media/${media.id}`}
      className="group flex-shrink-0 w-40"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c2a3f] mb-2 hover:ring-2 hover:ring-white/30 transition-all">
        {media.posterPath ? (
          <img 
            src={media.posterPath} 
            alt={media.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1c2a3f] to-[#243349] flex items-center justify-center">
            <span className="text-white/30 text-3xl font-semibold">{media.title?.[0]}</span>
          </div>
        )}
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={20} className="text-black ml-1" fill="black" />
          </div>
        </div>
      </div>
      <h4 className="text-white text-sm font-medium truncate">{media.title}</h4>
      {media.episode && (
        <p className="text-white/50 text-xs truncate">{media.episode}</p>
      )}
    </Link>
  )
}

export default function Home() {
  const { user, hasLibraries } = useAuth()
  const [libraries, setLibraries] = useState([])
  const [recentMedia, setRecentMedia] = useState([])
  const [continueWatching, setContinueWatching] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      const [librariesRes, recentRes] = await Promise.all([
        api.get('/library'),
        api.get('/media/recent?limit=20')
      ])
      setLibraries(librariesRes.data)
      setRecentMedia(recentRes.data)

      try {
        const continueRes = await api.get('/media/user/continue')
        setContinueWatching(continueRes.data)
      } catch (e) {
        // Ignore if no watch history
      }
    } catch (error) {
      console.error('Failed to fetch home data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show library setup prompt if no libraries
  if (!loading && !hasLibraries) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-28 h-28 bg-[#1c2a3f] rounded-full flex items-center justify-center mb-6">
          <FolderOpen size={52} className="text-white/30" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-3">Welcome to Soundstage!</h1>
        <p className="text-white/50 mb-8 max-w-md leading-relaxed">
          Get started by adding your first media library. Point Soundstage to a folder 
          containing your movies, TV shows, music, or photos.
        </p>
        <Link
          to="/add-library"
          className="flex items-center gap-2 px-6 py-3 bg-[#00a4dc] hover:bg-[#00b4ec] text-white font-medium rounded-lg transition-all"
        >
          <Plus size={20} />
          Add Your First Library
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Skeleton loading */}
        <div>
          <div className="h-6 w-32 bg-[#1c2a3f] rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-video bg-[#1c2a3f] rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* My Media - Library Cards */}
      {libraries.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">My Media</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {libraries.map(library => (
              <LibraryCard key={library.id} library={library} />
            ))}
          </div>
        </section>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Continue Watching</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hidden">
            {continueWatching.map(media => (
              <MediaCard key={media.id} media={media} showProgress />
            ))}
          </div>
        </section>
      )}

      {/* Next Up */}
      {recentMedia.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-white">Next Up</h2>
            <Link to="/recent" className="text-white/50 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hidden">
            {recentMedia.slice(0, 8).map(media => (
              <PosterCard key={media.id} media={media} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentMedia.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Recently Added</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hidden">
            {recentMedia.map(media => (
              <PosterCard key={media.id} media={media} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {libraries.length === 0 && recentMedia.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/50 text-lg">No media found. Add a library to get started!</p>
        </div>
      )}
    </div>
  )
}
