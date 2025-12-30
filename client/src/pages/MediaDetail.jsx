import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  Play, 
  Clock, 
  Calendar, 
  Star, 
  ArrowLeft,
  Film,
  Tv,
  Music,
  Shuffle,
  Check,
  Heart,
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function MediaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [media, setMedia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [showAllCast, setShowAllCast] = useState(false)

  useEffect(() => {
    fetchMedia()
  }, [id])

  const fetchMedia = async () => {
    try {
      const { data } = await api.get(`/media/${id}`)
      setMedia(data)
      // Set initial selected season to first available
      if (data.seasons?.length > 0) {
        setSelectedSeason(data.seasons[0].season_number)
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    if (path.startsWith('/cache')) return `/api${path}`
    return path
  }

  const getNextEpisode = () => {
    if (!media?.episodes) return null
    // Find first unwatched episode or first episode
    return media.episodes[0]
  }

  const getSeasonEpisodes = (seasonNum) => {
    if (!media?.episodes) return []
    return media.episodes.filter(ep => ep.season_number === seasonNum)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010]">
        <div className="h-[70vh] bg-neutral-900 skeleton"></div>
      </div>
    )
  }

  if (!media) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl text-white mb-2">Media not found</h2>
        <button onClick={() => navigate(-1)} className="text-neutral-400 hover:text-white">
          Go back
        </button>
      </div>
    )
  }

  const Icon = media.type === 'tvshow' ? Tv : media.type === 'album' ? Music : Film
  const genres = media.genres || []
  const cast = media.cast || []
  const directors = media.directors || []
  const writers = media.writers || []
  const displayCast = showAllCast ? cast : cast.slice(0, 8)
  const nextEpisode = getNextEpisode()
  const yearDisplay = media.end_year && media.end_year !== media.year 
    ? `${media.year}–${media.end_year}` 
    : media.year

  return (
    <div className="animate-fade-in -m-6">
      {/* Hero section with backdrop */}
      <div className="relative min-h-[70vh]">
        {/* Backdrop image */}
        <div className="absolute inset-0">
          {media.backdrop_path ? (
            <img 
              src={getImageUrl(media.backdrop_path)} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900"></div>
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#101010]/90 via-transparent to-transparent"></div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 text-white/70 hover:text-white transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Content overlay */}
        <div className="relative z-10 min-h-[70vh] flex items-end">
          <div className="w-full px-8 pb-8">
            {/* Title section */}
            <div className="max-w-4xl space-y-4">
              {/* Logo or title */}
              {media.logo_path ? (
                <img 
                  src={getImageUrl(media.logo_path)} 
                  alt={media.title}
                  className="h-24 object-contain"
                />
              ) : (
                <h1 className="text-5xl sm:text-6xl font-bold text-white drop-shadow-lg">
                  {media.title}
                </h1>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-white/90">
                {yearDisplay && (
                  <span>{yearDisplay}</span>
                )}
                {media.content_rating && (
                  <span className="px-2 py-0.5 border border-white/40 rounded text-sm">
                    {media.content_rating}
                  </span>
                )}
                {media.rating && (
                  <span className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-400" fill="currentColor" />
                    {media.rating.toFixed(1)}
                  </span>
                )}
                {media.duration && (
                  <span>{formatDuration(media.duration)}</span>
                )}
                {media.season_count && (
                  <span>{media.season_count} Season{media.season_count !== 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  to={media.type === 'tvshow' && nextEpisode 
                    ? `/play/${media.id}?episode=${nextEpisode.id}` 
                    : `/play/${media.id}`}
                  className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg transition-all"
                >
                  <Play size={20} fill="currentColor" />
                  {media.progress?.position > 0 ? 'Resume' : 'Play'}
                </Link>
                
                {media.type === 'tvshow' && (
                  <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
                    <Shuffle size={20} />
                  </button>
                )}
                
                <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
                  <Check size={20} />
                </button>
                
                <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
                  <Heart size={20} />
                </button>
                
                <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {/* Tagline */}
              {media.tagline && (
                <p className="text-white/70 italic text-lg">"{media.tagline}"</p>
              )}

              {/* Overview */}
              {media.overview && (
                <p className="text-white/80 leading-relaxed max-w-3xl text-lg">
                  {media.overview}
                </p>
              )}

              {/* External links */}
              <div className="flex items-center gap-4 pt-2">
                {media.imdb_id && (
                  <a 
                    href={`https://www.imdb.com/title/${media.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    <span className="font-bold">IMDb</span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {media.tmdb_id && (
                  <a 
                    href={`https://www.themoviedb.org/${media.type === 'tvshow' ? 'tv' : 'movie'}/${media.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
                  >
                    <span className="font-bold">TMDB</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="px-8 py-8 space-y-10 bg-[#101010]">
        
        {/* Metadata sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Genres */}
          {genres.length > 0 && (
            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-2">Genres</h3>
              <p className="text-white">{genres.join(', ')}</p>
            </div>
          )}

          {/* Directors */}
          {directors.length > 0 && (
            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-2">
                {directors.length > 1 ? 'Directors' : 'Director'}
              </h3>
              <p className="text-white">{directors.map(d => d.name || d).join(', ')}</p>
            </div>
          )}

          {/* Writers */}
          {writers.length > 0 && (
            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-2">Writers</h3>
              <p className="text-white">{writers.slice(0, 3).map(w => w.name || w).join(', ')}</p>
            </div>
          )}

          {/* Studio */}
          {media.studio && (
            <div>
              <h3 className="text-neutral-400 text-sm font-medium mb-2">Studio</h3>
              <p className="text-white">{media.studio}</p>
            </div>
          )}
        </div>

        {/* Cast section */}
        {cast.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {displayCast.map((actor, i) => (
                <div key={i} className="text-center">
                  <div className="aspect-square rounded-full overflow-hidden bg-neutral-800 mb-2 mx-auto w-20">
                    {actor.profile_path ? (
                      <img 
                        src={actor.profile_path} 
                        alt={actor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 text-2xl font-bold">
                        {(actor.name || '?')[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium truncate">{actor.name}</p>
                  {actor.character && (
                    <p className="text-neutral-500 text-xs truncate">{actor.character}</p>
                  )}
                </div>
              ))}
            </div>
            {cast.length > 8 && (
              <button 
                onClick={() => setShowAllCast(!showAllCast)}
                className="mt-4 flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
              >
                {showAllCast ? (
                  <>Show less <ChevronUp size={16} /></>
                ) : (
                  <>Show all {cast.length} cast members <ChevronDown size={16} /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* TV Show: Next Up section */}
        {media.type === 'tvshow' && nextEpisode && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Next Up</h2>
            <Link
              to={`/play/${media.id}?episode=${nextEpisode.id}`}
              className="flex flex-col sm:flex-row gap-4 bg-neutral-900 rounded-lg overflow-hidden hover:bg-neutral-800 transition-all group border border-neutral-800"
            >
              <div className="sm:w-64 aspect-video bg-neutral-800 flex-shrink-0 relative">
                {nextEpisode.still_path ? (
                  <img 
                    src={nextEpisode.still_path} 
                    alt={nextEpisode.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tv size={32} className="text-neutral-700" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={40} className="text-white" fill="currentColor" />
                </div>
              </div>
              <div className="p-4 flex-1">
                <p className="text-neutral-400 text-sm">
                  S{String(nextEpisode.season_number).padStart(2, '0')} E{String(nextEpisode.episode_number).padStart(2, '0')}
                </p>
                <h3 className="text-white font-semibold text-lg">{nextEpisode.title || `Episode ${nextEpisode.episode_number}`}</h3>
                {nextEpisode.overview && (
                  <p className="text-neutral-400 mt-2 line-clamp-2">{nextEpisode.overview}</p>
                )}
                {nextEpisode.runtime && (
                  <p className="text-neutral-500 text-sm mt-2">{nextEpisode.runtime} min</p>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* TV Show: Seasons grid */}
        {media.seasons && media.seasons.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Seasons</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {media.seasons.filter(s => s.season_number > 0).map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeason(season.season_number)}
                  className={`text-left rounded-lg overflow-hidden transition-all ${
                    selectedSeason === season.season_number 
                      ? 'ring-2 ring-white' 
                      : 'hover:ring-2 hover:ring-neutral-600'
                  }`}
                >
                  <div className="aspect-[2/3] bg-neutral-800 relative">
                    {season.poster_path ? (
                      <img 
                        src={season.poster_path} 
                        alt={season.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-neutral-700">{season.season_number}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-neutral-900">
                    <p className="text-white text-sm font-medium truncate">{season.name || `Season ${season.season_number}`}</p>
                    <p className="text-neutral-500 text-xs">{season.episode_count} Episodes</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Episodes list for selected season */}
        {media.episodes && media.episodes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              {media.seasons ? `Season ${selectedSeason} Episodes` : 'Episodes'}
            </h2>
            <div className="grid gap-3">
              {getSeasonEpisodes(selectedSeason).map((episode) => (
                <Link
                  key={episode.id}
                  to={`/play/${media.id}?episode=${episode.id}`}
                  className="flex flex-col sm:flex-row gap-4 p-4 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-all group border border-neutral-800 hover:border-neutral-700"
                >
                  {/* Episode thumbnail */}
                  <div className="sm:w-48 aspect-video bg-neutral-800 rounded overflow-hidden flex-shrink-0 relative">
                    {episode.still_path ? (
                      <img 
                        src={episode.still_path} 
                        alt={episode.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play size={24} className="text-neutral-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={32} className="text-white" fill="currentColor" />
                    </div>
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-neutral-400 text-sm">
                          Episode {episode.episode_number}
                        </p>
                        <h3 className="text-white font-medium">
                          {episode.title || `Episode ${episode.episode_number}`}
                        </h3>
                      </div>
                      {episode.runtime && (
                        <span className="text-neutral-500 text-sm flex-shrink-0">
                          {episode.runtime} min
                        </span>
                      )}
                    </div>
                    {episode.overview && (
                      <p className="text-neutral-500 text-sm mt-2 line-clamp-2">{episode.overview}</p>
                    )}
                    {episode.air_date && (
                      <p className="text-neutral-600 text-xs mt-2">{episode.air_date}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tracks for albums */}
        {media.tracks && media.tracks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Tracks</h2>
            <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              {media.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-4 hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-0"
                >
                  <span className="w-8 text-center text-neutral-500">{track.track_number || index + 1}</span>
                  <div className="flex-1">
                    <p className="text-white">{track.title}</p>
                  </div>
                  {track.duration && (
                    <span className="text-neutral-600 text-sm">{formatDuration(track.duration)}</span>
                  )}
                  <button className="p-2 text-neutral-500 hover:text-white transition-colors">
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
