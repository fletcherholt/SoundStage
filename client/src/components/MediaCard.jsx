import { Link } from 'react-router-dom'
import { Play, Clock } from 'lucide-react'

export default function MediaCard({ media, showProgress = false }) {
  const formatDuration = (seconds) => {
    if (!seconds) return ''
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'movie': return 'Movie'
      case 'tvshow': return 'TV Show'
      case 'album': return 'Album'
      case 'photo': return 'Photo'
      default: return type
    }
  }

  const progressPercent = showProgress && media.progress && media.duration
    ? (media.progress.position / media.duration) * 100
    : 0

  return (
    <Link 
      to={`/media/${media.id}`}
      className="media-card block group relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-600"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-neutral-900 relative overflow-hidden">
        {media.poster_path ? (
          <img
            src={media.poster_path.startsWith('http') ? media.poster_path : 
                 media.poster_path.startsWith('/cache') ? `/api${media.poster_path}` : 
                 `/api/stream/thumbnail/${media.id}`}
            alt={media.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <span className="text-4xl text-neutral-700">{media.title?.[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={30} className="text-black ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white font-medium">
          {getTypeLabel(media.type)}
        </div>

        {/* Duration */}
        {media.duration && (
          <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white flex items-center gap-1.5">
            <Clock size={12} />
            {formatDuration(media.duration)}
          </div>
        )}

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
            <div 
              className="h-full bg-white transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-white truncate group-hover:text-neutral-300 transition-colors">
          {media.title}
        </h3>
        <p className="text-sm text-neutral-500 mt-1">
          {media.year || 'Unknown year'}
          {media.rating && ` • ★ ${media.rating.toFixed(1)}`}
        </p>
      </div>
    </Link>
  )
}
