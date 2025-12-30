import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import MediaCard from '../components/MediaCard'
import { Film, Tv, Music, Image, Grid, List, Search } from 'lucide-react'

const typeConfig = {
  movies: { icon: Film, label: 'Movies', apiType: 'movie' },
  tvshows: { icon: Tv, label: 'TV Shows', apiType: 'tvshow' },
  music: { icon: Music, label: 'Music', apiType: 'album' },
  photos: { icon: Image, label: 'Photos', apiType: 'photo' }
}

export default function Library({ type }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [media, setMedia] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const config = typeConfig[type] || typeConfig.movies
  const Icon = config.icon

  useEffect(() => {
    fetchMedia()
  }, [type, searchQuery])

  const fetchMedia = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', config.apiType)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '100')

      const { data } = await api.get(`/media?${params}`)
      setMedia(data.media)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
            <Icon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{config.label}</h1>
            <p className="text-neutral-500 text-sm">{total} items</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              placeholder={`Search ${config.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* View toggle */}
          <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden">
              <div className="aspect-[2/3] bg-neutral-900 skeleton"></div>
              <div className="p-3">
                <div className="h-4 w-24 bg-neutral-900 rounded skeleton"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid view */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-2">
          {media.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-4 p-3 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors border border-neutral-800"
            >
              <div className="w-12 h-16 bg-neutral-800 rounded overflow-hidden flex-shrink-0">
                {item.poster_path ? (
                  <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Icon size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{item.title}</h3>
                <p className="text-neutral-500 text-sm">{item.year || 'Unknown year'}</p>
              </div>
              {item.rating && (
                <div className="text-neutral-500 text-sm">★ {item.rating.toFixed(1)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && media.length === 0 && (
        <div className="text-center py-16">
          <Icon className="mx-auto text-neutral-600 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-white mb-2">No {config.label.toLowerCase()} found</h3>
          <p className="text-neutral-500">
            {searchQuery 
              ? `No results for "${searchQuery}"`
              : `Add a ${type} library to see content here.`}
          </p>
        </div>
      )}
    </div>
  )
}
