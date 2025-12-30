import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  AlertCircle
} from 'lucide-react'

export default function Player() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  const [media, setMedia] = useState(null)
  const [episode, setEpisode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffering, setBuffering] = useState(false)

  const episodeId = searchParams.get('episode')

  useEffect(() => {
    fetchMedia()
    
    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      // Save progress on unmount
      saveProgress()
    }
  }, [id, episodeId])

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout()
    const handleKeyDown = (e) => {
      resetControlsTimeout()
      // Keyboard shortcuts
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'ArrowLeft') {
        skip(-10)
      } else if (e.code === 'ArrowRight') {
        skip(10)
      } else if (e.code === 'KeyM') {
        toggleMute()
      } else if (e.code === 'KeyF') {
        toggleFullscreen()
      } else if (e.code === 'Escape' && isFullscreen) {
        document.exitFullscreen()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyDown)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [playing, resetControlsTimeout, isFullscreen])

  const fetchMedia = async () => {
    try {
      const { data } = await api.get(`/media/${id}`)
      setMedia(data)

      if (episodeId && data.episodes) {
        const ep = data.episodes.find(e => e.id === episodeId)
        setEpisode(ep)
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
      setError('Failed to load media information')
    } finally {
      setLoading(false)
    }
  }

  const saveProgress = async () => {
    if (!videoRef.current || !media) return
    const currentPos = videoRef.current.currentTime
    const totalDuration = videoRef.current.duration
    if (!currentPos || !totalDuration) return
    
    try {
      await api.post(`/media/${id}/progress`, {
        position: Math.floor(currentPos),
        completed: currentPos >= totalDuration - 30
      })
    } catch (e) {
      // Ignore errors
    }
  }

  const getStreamUrl = () => {
    // Use the API base URL for streaming
    const baseUrl = window.location.origin
    if (episode) {
      return `${baseUrl}/api/stream/episode/${episode.id}`
    }
    return `${baseUrl}/api/stream/video/${id}`
  }

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(err => {
          console.error('Play failed:', err)
          setError('Failed to play video. Try clicking the play button.')
        })
      }
    }
  }, [playing])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !muted
      videoRef.current.muted = newMuted
      setMuted(newMuted)
    }
  }, [muted])

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setMuted(newVolume === 0)
    }
  }

  const toggleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }, [])

  const handleProgressClick = (e) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pos * duration
      saveProgress()
    }
  }

  const skip = useCallback((seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration))
    }
  }, [duration])

  const handleVideoError = (e) => {
    console.error('Video error:', e)
    const video = videoRef.current
    if (video?.error) {
      const errorMessages = {
        1: 'Video loading aborted',
        2: 'Network error while loading video',
        3: 'Video decoding failed - format may not be supported',
        4: 'Video format not supported by your browser'
      }
      setError(errorMessages[video.error.code] || 'Unknown video error')
    } else {
      setError('Failed to load video')
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      // Restore progress after metadata loads
      if (media?.progress?.position && media.progress.position > 30) {
        videoRef.current.currentTime = media.progress.position
      }
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!media) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-white mb-4">Media not found</p>
          <button onClick={() => navigate(-1)} className="text-neutral-400 hover:text-white">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const title = episode 
    ? `${media.title} - S${String(episode.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')}`
    : media.title

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col cursor-none"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={getStreamUrl()}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onEnded={() => {
          saveProgress()
          setPlaying(false)
        }}
        playsInline
        preload="metadata"
      />

      {/* Buffering indicator */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <p className="text-white mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => {
                  setError(null)
                  if (videoRef.current) {
                    videoRef.current.load()
                  }
                }}
                className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
              >
                Retry
              </button>
              <button 
                onClick={() => navigate(-1)} 
                className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div 
        className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="text-white" size={24} />
          </button>
          <h1 className="text-white font-medium truncate">{title}</h1>
        </div>

        {/* Center play button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full flex items-center justify-center transition-colors"
          >
            {playing ? (
              <Pause size={40} className="text-white" fill="currentColor" />
            ) : (
              <Play size={40} className="text-white ml-1" fill="currentColor" />
            )}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="p-4 space-y-3">
          {/* Progress bar */}
          <div 
            ref={progressRef}
            className="h-1 bg-white/30 rounded cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-white rounded relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {playing ? (
                  <Pause className="text-white" size={24} fill="currentColor" />
                ) : (
                  <Play className="text-white" size={24} fill="currentColor" />
                )}
              </button>
              
              <button
                onClick={() => skip(-10)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <SkipBack className="text-white" size={20} />
              </button>
              
              <button
                onClick={() => skip(10)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <SkipForward className="text-white" size={20} />
              </button>

              <div className="flex items-center gap-2 group/volume">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="text-white" size={20} />
                  ) : (
                    <Volume2 className="text-white" size={20} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-white cursor-pointer"
                />
              </div>

              <span className="text-white text-sm ml-2 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="text-white" size={20} />
                ) : (
                  <Maximize className="text-white" size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
