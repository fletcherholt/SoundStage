import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProfileSelect from './pages/ProfileSelect'
import Home from './pages/Home'
import Library from './pages/Library'
import MediaDetail from './pages/MediaDetail'
import Player from './pages/Player'
import Settings from './pages/Settings'
import AddLibrary from './pages/AddLibrary'

function StartupAnimation({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false)

  const handleVideoEnd = () => {
    setFadeOut(true)
    setTimeout(onComplete, 500)
  }

  // Skip animation if video fails to load
  const handleVideoError = () => {
    onComplete()
  }

  return (
    <div className={`startup-video transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        onError={handleVideoError}
        className="max-w-2xl"
      >
        <source src="/api/logos/Soundstage%20intro.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()
  const [showStartup, setShowStartup] = useState(true)
  const [startupComplete, setStartupComplete] = useState(false)

  useEffect(() => {
    // Check if startup animation was already shown this session
    const hasShown = sessionStorage.getItem('soundstage_startup_shown')
    if (hasShown) {
      setShowStartup(false)
      setStartupComplete(true)
    }
  }, [])

  const handleStartupComplete = () => {
    sessionStorage.setItem('soundstage_startup_shown', 'true')
    setShowStartup(false)
    setStartupComplete(true)
  }

  // Show startup animation
  if (showStartup && !startupComplete) {
    return <StartupAnimation onComplete={handleStartupComplete} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <img src="/api/logos/Soundstage%20logo.png" alt="Soundstage" className="h-16 mx-auto mb-6 animate-pulse" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Show profile selection if no user selected
  if (!user) {
    return <ProfileSelect />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Library type="movies" />} />
        <Route path="/tvshows" element={<Library type="tvshows" />} />
        <Route path="/music" element={<Library type="music" />} />
        <Route path="/photos" element={<Library type="photos" />} />
        <Route path="/media/:id" element={<MediaDetail />} />
        <Route path="/play/:id" element={<Player />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/add-library" element={<AddLibrary />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
