import { useRef, useState, useCallback } from 'react'
import { Play, Pause, Camera, Volume2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatDuration, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function PreviewMonitor() {
  const { mediaItems, selectedMediaId } = useAppStore()
  const selectedMedia = mediaItems.find(m => m.id === selectedMediaId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (v) setCurrentTime(v.currentTime)
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const t = Number(e.target.value)
    v.currentTime = t
    setCurrentTime(t)
  }, [])

  const handleSnapshot = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(v, 0, 0)
      const link = document.createElement('a')
      link.download = `snapshot_${Math.round(currentTime)}s.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }, [currentTime])

  const isVideo = selectedMedia?.video_codec != null

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Monitor label */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Preview Monitor</span>
        {selectedMedia && (
          <span className="text-[10px] text-zinc-500 truncate max-w-40">{selectedMedia.filename}</span>
        )}
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center bg-black relative min-h-0">
        {selectedMedia && isVideo ? (
          <video
            ref={videoRef}
            key={selectedMedia.id}
            src={`/api/media/${selectedMedia.id}/stream`}
            className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              const v = videoRef.current
              if (v) setDuration(v.duration)
            }}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />
        ) : selectedMedia && selectedMedia.thumbnail_path ? (
          <img
            src={`/thumbnails/${selectedMedia.id}.jpg`}
            alt={selectedMedia.filename}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Play className="h-6 w-6 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-600">Select a media file to preview</p>
          </div>
        )}

        {/* Metadata overlay */}
        {selectedMedia && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            {selectedMedia.width && selectedMedia.height && (
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                {selectedMedia.width}×{selectedMedia.height}
              </span>
            )}
            {selectedMedia.fps && (
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                {selectedMedia.fps.toFixed(2)} fps
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {selectedMedia && isVideo && (
        <div className="px-3 py-2 border-t border-zinc-800 space-y-2">
          {/* Seek bar */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 rounded-full appearance-none bg-zinc-800 accent-blue-500 cursor-pointer"
          />

          {/* Controls row */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {playing
                ? <Pause className="h-3.5 w-3.5" />
                : <Play className="h-3.5 w-3.5" />
              }
            </Button>

            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <div className="flex-1" />

            <Volume2 className="h-3 w-3 text-zinc-500" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => {
                const v = Number(e.target.value)
                setVolume(v)
                if (videoRef.current) videoRef.current.volume = v
              }}
              className="w-16 h-1 rounded-full appearance-none bg-zinc-800 accent-blue-500 cursor-pointer"
            />

            <Button variant="ghost" size="icon" onClick={handleSnapshot} title="Snapshot">
              <Camera className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
