import { Cpu, Activity, Zap, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { ffmpegStatus, activeProject } = useAppStore()

  const hasGpu = ffmpegStatus?.gpu_detected && ffmpegStatus?.any_nvenc_available

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold tracking-tight text-zinc-100">GPU Media Forge</span>
        </div>
        {activeProject && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 text-xs">{activeProject.name}</span>
          </>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4">
        {ffmpegStatus ? (
          <>
            {/* FFmpeg status */}
            <div className="flex items-center gap-1.5 text-xs">
              <div className={cn('h-1.5 w-1.5 rounded-full', ffmpegStatus.ffmpeg_found ? 'bg-emerald-400' : 'bg-red-500')} />
              <span className="text-zinc-400">FFmpeg</span>
            </div>

            {/* GPU status */}
            <div className="flex items-center gap-1.5 text-xs">
              {hasGpu ? (
                <>
                  <Cpu className="h-3 w-3 text-green-400" />
                  <span className="text-green-400 font-medium">{ffmpegStatus.gpu_name ?? 'GPU'}</span>
                  <span className="text-zinc-600">NVENC</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-500 text-xs">CPU Mode</span>
                </>
              )}
            </div>

            {/* Encoder */}
            <div className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              <Activity className="h-3 w-3 text-blue-400" />
              <span>{ffmpegStatus.recommended_encoder}</span>
            </div>
          </>
        ) : (
          <span className="text-xs text-zinc-600 animate-pulse">Checking FFmpeg...</span>
        )}
      </div>
    </header>
  )
}
