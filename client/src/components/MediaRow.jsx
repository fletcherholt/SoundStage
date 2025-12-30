import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MediaCard from './MediaCard'

export default function MediaRow({ title, media, showProgress = false }) {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!media || media.length === 0) return null

  return (
    <section className="mb-10 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2.5 bg-neutral-900 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all border border-neutral-800 hover:border-neutral-700"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 bg-neutral-900 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all border border-neutral-800 hover:border-neutral-700"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {media.map((item, index) => (
          <div 
            key={item.id} 
            className="flex-shrink-0 w-48"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <MediaCard media={item} showProgress={showProgress} />
          </div>
        ))}
      </div>
    </section>
  )
}
