import { useEffect, useCallback, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { LayoutGrid, GitBranch, ListTodo } from 'lucide-react'

import { TopBar }              from '@/components/layout/TopBar'
import { WorkspaceBar }        from '@/components/layout/WorkspaceBar'
import { PanelFrame }          from '@/components/layout/PanelFrame'
import { FloatingPanelHost }   from '@/components/layout/FloatingPanelHost'
import { MediaLibrary }        from '@/components/media/MediaLibrary'
import { PreviewMonitor }      from '@/components/preview/PreviewMonitor'
import { Inspector }           from '@/components/inspector/Inspector'
import { JobsPanel }           from '@/components/jobs/JobsPanel'
import { NodeGraph }           from '@/components/nodes/NodeGraph'
import { Timeline }            from '@/components/timeline/Timeline'

import { useAppStore }         from '@/store/useAppStore'
import { usePanelStore }       from '@/store/panelStore'
import { useBroadcastSync, broadcastPatch } from '@/lib/broadcast'
import { getFFmpegStatus, listProjects, createProject, listMedia, listJobs } from '@/lib/api'
import { cn }                  from '@/lib/utils'

// ─── Broadcast sync hook ───────────────────────────────────────────────────────

function useSyncAcrossWindows() {
  const store = useAppStore()

  const getSnapshot = useCallback(() => ({
    mediaItems:      store.mediaItems,
    jobs:            store.jobs,
    selectedMediaId: store.selectedMediaId,
    activeProject:   store.activeProject,
    ffmpegStatus:    store.ffmpegStatus,
  }), [store.mediaItems, store.jobs, store.selectedMediaId, store.activeProject, store.ffmpegStatus])

  const applyPatch = useCallback((patch: Parameters<typeof broadcastPatch>[0]) => {
    if (patch.mediaItems      !== undefined) store.setMediaItems(patch.mediaItems)
    if (patch.jobs            !== undefined) store.setJobs(patch.jobs)
    if (patch.selectedMediaId !== undefined) store.setSelectedMediaId(patch.selectedMediaId)
    if (patch.activeProject   !== undefined) store.setActiveProject(patch.activeProject)
    if (patch.ffmpegStatus    != null) store.setFFmpegStatus(patch.ffmpegStatus)
  }, [store])

  useBroadcastSync(getSnapshot, applyPatch)

  // Broadcast whenever key slices change
  useEffect(() => {
    broadcastPatch({ mediaItems: store.mediaItems })
  }, [store.mediaItems])

  useEffect(() => {
    broadcastPatch({ jobs: store.jobs })
  }, [store.jobs])

  useEffect(() => {
    broadcastPatch({ selectedMediaId: store.selectedMediaId })
  }, [store.selectedMediaId])
}

// ─── Bottom tab strip ──────────────────────────────────────────────────────────

const BOTTOM_TABS = [
  { id: 'jobs'     as const, label: 'Jobs & Logs',   icon: ListTodo  },
  { id: 'nodes'    as const, label: 'Node Pipeline',  icon: GitBranch },
  { id: 'timeline' as const, label: 'Timeline',       icon: LayoutGrid },
]

function BottomTabBar() {
  const { bottomTab, setBottomTab, panels } = usePanelStore()

  // Only show tabs for panels that are docked
  const visible = BOTTOM_TABS.filter(t => panels[t.id].mode === 'docked')

  if (visible.length === 0) return null

  return (
    <div className="flex items-center border-b border-zinc-800 bg-zinc-950 px-2 shrink-0">
      {visible.map(tab => {
        const Icon = tab.icon
        const active = bottomTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setBottomTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
              active
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300',
            )}
          >
            <Icon className="h-3 w-3" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main editor layout ────────────────────────────────────────────────────────

export function EditorLayout() {
  const { setFFmpegStatus, setActiveProject, setMediaItems, setJobs } = useAppStore()
  const { panels, bottomTab } = usePanelStore()
  const [ready, setReady] = useState(false)

  useSyncAcrossWindows()

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getFFmpegStatus()
        setFFmpegStatus(status)
      } catch {}

      try {
        const projects = await listProjects()
        let project = projects[0]
        if (!project) project = await createProject('Default Project')
        setActiveProject(project)
        const [media, jobs] = await Promise.all([listMedia(project.id), listJobs(project.id)])
        setMediaItems(media)
        setJobs(jobs)
      } catch {}

      setReady(true)
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Initializing GPU Media Forge…</p>
        </div>
      </div>
    )
  }

  const mediaMode     = panels.media.mode
  const previewMode   = panels.preview.mode
  const inspectorMode = panels.inspector.mode

  // Any bottom panel docked?
  const anyBottomDocked = (['jobs', 'nodes', 'timeline'] as const).some(
    id => panels[id].mode === 'docked',
  )

  // Active bottom content
  const BottomContent =
    bottomTab === 'jobs'     ? JobsPanel  :
    bottomTab === 'nodes'    ? NodeGraph  :
    bottomTab === 'timeline' ? Timeline   : null

  // Show bottom section only if active tab panel is docked
  const showBottom = anyBottomDocked && BottomContent && panels[bottomTab].mode === 'docked'

  // How many side panels are docked (determines resize handle rendering)
  const leftDocked  = mediaMode     === 'docked'
  const rightDocked = inspectorMode === 'docked'
  const centerHasPanels = previewMode === 'docked' || showBottom

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <TopBar />
      <WorkspaceBar />

      <div className="flex-1 min-h-0 relative">
        <PanelGroup direction="horizontal" autoSaveId="gmf-h">
          {/* Left: Media Library */}
          {leftDocked && (
            <>
              <Panel defaultSize={15} minSize={10} maxSize={28} id="media">
                <PanelFrame panelId="media">
                  <MediaLibrary />
                </PanelFrame>
              </Panel>
              <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-blue-600 transition-colors cursor-col-resize" />
            </>
          )}

          {/* Center */}
          <Panel minSize={30} id="center">
            <PanelGroup direction="vertical" autoSaveId="gmf-v">
              {/* Preview */}
              {previewMode === 'docked' && (
                <>
                  <Panel defaultSize={showBottom ? 55 : 100} minSize={20} id="preview">
                    <PanelFrame panelId="preview">
                      <PreviewMonitor />
                    </PanelFrame>
                  </Panel>
                  {showBottom && (
                    <PanelResizeHandle className="h-px bg-zinc-800 hover:bg-blue-600 transition-colors cursor-row-resize" />
                  )}
                </>
              )}

              {/* Bottom tab area */}
              {showBottom && BottomContent && (
                <Panel defaultSize={previewMode === 'docked' ? 45 : 100} minSize={20} id="bottom">
                  <div className="flex flex-col h-full">
                    <BottomTabBar />
                    <div className="flex-1 min-h-0">
                      <BottomContent />
                    </div>
                  </div>
                </Panel>
              )}

              {/* Nothing docked in center — placeholder */}
              {previewMode !== 'docked' && !showBottom && (
                <Panel id="empty">
                  <EmptyCenter />
                </Panel>
              )}
            </PanelGroup>
          </Panel>

          {/* Right: Inspector */}
          {rightDocked && (
            <>
              <PanelResizeHandle className="w-px bg-zinc-800 hover:bg-blue-600 transition-colors cursor-col-resize" />
              <Panel defaultSize={22} minSize={16} maxSize={38} id="inspector">
                <PanelFrame panelId="inspector">
                  <Inspector />
                </PanelFrame>
              </Panel>
            </>
          )}
        </PanelGroup>

        {/* Floating panel overlays */}
        <FloatingPanelHost />
      </div>
    </div>
  )
}

function EmptyCenter() {
  const { applyWorkspace } = usePanelStore()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center bg-zinc-950">
      <p className="text-zinc-600 text-sm">All panels are hidden or floating.</p>
      <button
        onClick={() => applyWorkspace('edit')}
        className="text-xs text-blue-400 hover:text-blue-300 underline"
      >
        Reset to Edit layout
      </button>
    </div>
  )
}
