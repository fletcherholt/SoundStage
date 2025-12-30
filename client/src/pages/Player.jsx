import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings
} from 'lucide-react'

export default function Player() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)

  const [media, setMedia] = useState(null)
  const [episode, setEpisode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState(null)

  const episodeId = searchParams.get('episode')

  useEffect(() => {
    fetchMedia()
    return () => {
      // Save progress on unmount
      if (videoRef.current && media) {
        saveProgress()
      }
    }
  }, [id, episodeId])

  useEffect(() => {
    // Auto-hide controls
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeout) clearTimeout(controlsTimeout)
      
      const timeout = setTimeout(() => {
        if (playing) setShowControls(false)
      }, 3000)
      
      setControlsTimeout(timeout)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimeout) clearTimeout(controlsTimeout)
    }
  }, [playing, controlsTimeout])

  const fetchMedia = async () => {
    try {
      const { data } = await api.get(`/media/${id}`)
      setMedia(data)

      if (episodeId && data.episodes) {
        const ep = data.episodes.find(e => e.id === episodeId)
        setEpisode(ep)
      }

      // Restore progress
      if (data.progress?.position) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = data.progress.position
          }
        }, 500)
      }
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProgress = async () => {
    if (!videoRef.current) return
    try {
      await api.post(`/media/${id}/progress`, {
        position: Math.floor(videoRef.current.currentTime),
        completed: videoRef.current.currentTime >= videoRef.current.duration - 10
      })
    } catch (e) {
      // Ignore errors
    }
  }

  const getStreamUrl = () => {
    if (episode) {
      return `/api/stream/episode/${episode.id}`
    }
    return `/api/stream/video/${id}`
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const handleProgressClick = (e) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pos * duration
    }
  }

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
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
      className="fixed inset-0 bg-black flex flex-col"
      onClick={togglePlay}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={getStreamUrl()}
        className="w-full h-full object-contain"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={saveProgress}
      />

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

              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                {muted ? (
                  <VolumeX className="text-white" size={20} />
                ) : (
                  <Volume2 className="text-white" size={20} />
                )}
              </button>

              <span className="text-white text-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <Maximize className="text-white" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
