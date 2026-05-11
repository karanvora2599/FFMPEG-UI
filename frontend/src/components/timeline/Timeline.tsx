import { useRef } from 'react'
import { Film, GripHorizontal } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatDuration, cn } from '@/lib/utils'

export function Timeline() {
  const { mediaItems, selectedMediaId, setSelectedMediaId } = useAppStore()
  const timelineRef = useRef<HTMLDivElement>(null)

  // Show only video items in timeline for MVP
  const videoItems = mediaItems.filter(m => m.video_codec || m.duration)

  const totalDuration = videoItems.reduce((sum, m) => sum + (m.duration ?? 0), 0)

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center px-3 py-1.5 border-b border-zinc-800">
        <Film className="h-3.5 w-3.5 text-zinc-500 mr-2" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Timeline</span>
        <span className="ml-auto text-[10px] text-zinc-600">Total: {formatDuration(totalDuration)}</span>
      </div>

      {/* Track area */}
      <div className="flex flex-1 min-h-0">
        {/* Track label */}
        <div className="w-24 shrink-0 border-r border-zinc-800 flex flex-col">
          <div className="h-7 border-b border-zinc-800 flex items-center px-2">
            <span className="text-[9px] uppercase text-zinc-600">Video</span>
          </div>
          <div className="h-7 border-b border-zinc-800 flex items-center px-2">
            <span className="text-[9px] uppercase text-zinc-600">Audio</span>
          </div>
        </div>

        {/* Clip tracks */}
        <div ref={timelineRef} className="flex-1 overflow-x-auto min-w-0">
          {/* Ruler */}
          <div className="h-5 border-b border-zinc-800 bg-zinc-900/50 relative flex items-center px-1">
            {totalDuration > 0 && Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center"
                style={{ left: `${(i * 10 / totalDuration) * 100}%` }}
              >
                <div className="h-2 w-px bg-zinc-600" />
                <span className="text-[8px] text-zinc-600 font-mono">{formatDuration(i * 10)}</span>
              </div>
            ))}
          </div>

          {/* Video track */}
          <div className="h-7 border-b border-zinc-800 flex items-center px-1 gap-1 relative">
            {videoItems.length === 0 ? (
              <p className="text-[10px] text-zinc-700 px-2">Drop clips here</p>
            ) : (
              videoItems.map((item, idx) => {
                const pct = totalDuration > 0 ? ((item.duration ?? 0) / totalDuration) * 100 : 100 / videoItems.length
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMediaId(item.id)}
                    style={{ width: `${pct}%`, minWidth: '40px' }}
                    className={cn(
                      'h-5 rounded flex items-center px-1.5 gap-1 cursor-pointer transition-all overflow-hidden shrink-0',
                      item.id === selectedMediaId
                        ? 'bg-blue-600 border border-blue-400'
                        : 'bg-zinc-700 border border-zinc-600 hover:bg-zinc-600'
                    )}
                  >
                    <GripHorizontal className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
                    <span className="text-[9px] text-white truncate">{item.filename}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Audio track */}
          <div className="h-7 flex items-center px-1 gap-1">
            {videoItems.filter(m => m.audio_codec).map(item => {
              const pct = totalDuration > 0 ? ((item.duration ?? 0) / totalDuration) * 100 : 100 / videoItems.length
              return (
                <div
                  key={`audio-${item.id}`}
                  style={{ width: `${pct}%`, minWidth: '40px' }}
                  className="h-5 rounded bg-emerald-900/50 border border-emerald-800/60 flex items-center px-1.5 overflow-hidden shrink-0"
                >
                  <span className="text-[9px] text-emerald-300 truncate">{item.audio_codec}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
