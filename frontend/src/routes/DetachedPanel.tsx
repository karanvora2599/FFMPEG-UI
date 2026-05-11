/**
 * Rendered when the app is opened with ?panel=<panelId>.
 * Shows just that panel in a standalone, dark-framed window.
 * Syncs state from the main window via BroadcastChannel.
 */
import { useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { broadcastRequestState, useBroadcastSync } from '@/lib/broadcast'
import { getFFmpegStatus, listProjects, listMedia, listJobs } from '@/lib/api'

import { MediaLibrary }   from '@/components/media/MediaLibrary'
import { PreviewMonitor } from '@/components/preview/PreviewMonitor'
import { Inspector }      from '@/components/inspector/Inspector'
import { JobsPanel }      from '@/components/jobs/JobsPanel'
import { NodeGraph }      from '@/components/nodes/NodeGraph'
import { Timeline }       from '@/components/timeline/Timeline'
import type { PanelId }   from '@/store/panelStore'

const PANEL_COMPONENTS: Record<PanelId, React.ComponentType> = {
  media:     MediaLibrary,
  preview:   PreviewMonitor,
  inspector: Inspector,
  jobs:      JobsPanel,
  nodes:     NodeGraph,
  timeline:  Timeline,
}

const PANEL_LABELS: Record<PanelId, string> = {
  media:     'Media Library',
  preview:   'Preview Monitor',
  inspector: 'Inspector',
  jobs:      'Jobs & Logs',
  nodes:     'Node Pipeline',
  timeline:  'Timeline',
}

export function DetachedPanel({ panelId }: { panelId: string }) {
  const id = panelId as PanelId
  const store = useAppStore()

  // Sync: apply state patches from main window
  useBroadcastSync(
    // Snapshot (this window can also broadcast its changes)
    () => ({
      mediaItems:     store.mediaItems,
      jobs:           store.jobs,
      selectedMediaId: store.selectedMediaId,
      activeProject:  store.activeProject,
      ffmpegStatus:   store.ffmpegStatus,
    }),
    // Apply incoming patch
    (patch) => {
      if (patch.mediaItems  !== undefined) store.setMediaItems(patch.mediaItems)
      if (patch.jobs        !== undefined) store.setJobs(patch.jobs)
      if (patch.selectedMediaId !== undefined) store.setSelectedMediaId(patch.selectedMediaId)
      if (patch.activeProject !== undefined) store.setActiveProject(patch.activeProject)
      if (patch.ffmpegStatus != null) store.setFFmpegStatus(patch.ffmpegStatus)
    },
  )

  useEffect(() => {
    // Ask the main window for current state
    broadcastRequestState()

    // Also bootstrap independently in case main window is closed
    const bootstrap = async () => {
      try {
        const [status, projects] = await Promise.all([getFFmpegStatus(), listProjects()])
        store.setFFmpegStatus(status)
        const proj = projects[0]
        if (proj) {
          store.setActiveProject(proj)
          const [media, jobs] = await Promise.all([listMedia(proj.id), listJobs(proj.id)])
          store.setMediaItems(media)
          store.setJobs(jobs)
        }
      } catch {}
    }
    bootstrap()
  }, [])

  const Content = PANEL_COMPONENTS[id]
  const label = PANEL_LABELS[id] ?? panelId

  if (!Content) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Unknown panel: {panelId}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Detached window title bar */}
      <div className="flex items-center h-9 shrink-0 border-b border-zinc-800 bg-zinc-950 px-3 gap-2">
        <Zap className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-zinc-300">GPU Media Forge</span>
        <span className="text-zinc-600 text-xs">·</span>
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="ml-auto text-[10px] text-zinc-600 italic">Detached window — close to re-dock</span>
      </div>

      <div className="flex-1 min-h-0">
        <Content />
      </div>
    </div>
  )
}
