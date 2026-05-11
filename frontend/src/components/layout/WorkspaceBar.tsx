import { LayoutGrid, GitBranch, Download, Eye, SquareDashed, ExternalLink, EyeOff } from 'lucide-react'
import { usePanelStore, WORKSPACE_LAYOUTS, type PanelId } from '@/store/panelStore'
import { cn } from '@/lib/utils'

const WORKSPACE_ICONS = {
  edit: LayoutGrid,
  pipeline: GitBranch,
  export: Download,
  preview: Eye,
}

// Icon and short label for each panel toggle button
const PANEL_PILLS: { id: PanelId; short: string }[] = [
  { id: 'media',     short: 'Media' },
  { id: 'preview',   short: 'Preview' },
  { id: 'inspector', short: 'Inspector' },
  { id: 'jobs',      short: 'Jobs' },
  { id: 'nodes',     short: 'Nodes' },
  { id: 'timeline',  short: 'Timeline' },
]

export function WorkspaceBar() {
  const { panels, activeWorkspace, applyWorkspace, togglePanel, floatPanel, detachPanel } = usePanelStore()

  return (
    <div className="flex items-center h-8 shrink-0 border-b border-zinc-800 bg-zinc-950 px-2 gap-2">
      {/* Workspace presets */}
      <div className="flex items-center gap-0.5">
        {WORKSPACE_LAYOUTS.map(ws => {
          const Icon = WORKSPACE_ICONS[ws.id]
          const active = activeWorkspace === ws.id
          return (
            <button
              key={ws.id}
              onClick={() => applyWorkspace(ws.id)}
              title={ws.description}
              className={cn(
                'flex items-center gap-1.5 h-6 px-2.5 rounded text-xs font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
              )}
            >
              <Icon className="h-3 w-3" />
              {ws.label}
            </button>
          )
        })}
      </div>

      <div className="h-4 w-px bg-zinc-800 mx-1" />

      {/* Panel visibility pills */}
      <div className="flex items-center gap-1">
        {PANEL_PILLS.map(({ id, short }) => {
          const mode = panels[id].mode
          const isDocked    = mode === 'docked'
          const isFloating  = mode === 'floating'
          const isDetached  = mode === 'detached'
          const isHidden    = mode === 'hidden'

          return (
            <div key={id} className="group relative flex items-center">
              {/* Main toggle pill */}
              <button
                onClick={() => togglePanel(id)}
                title={`${isHidden ? 'Show' : 'Hide'} ${short}`}
                className={cn(
                  'flex items-center gap-1 h-5 px-2 rounded-l text-[10px] font-medium transition-colors border-r border-zinc-800',
                  isDocked   && 'bg-zinc-700 text-zinc-200',
                  isFloating && 'bg-blue-900 text-blue-200',
                  isDetached && 'bg-emerald-900 text-emerald-200',
                  isHidden   && 'bg-zinc-900 text-zinc-600 border-zinc-800',
                )}
              >
                {isHidden ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                {short}
                {isFloating  && <span className="text-[8px] ml-0.5 opacity-60">float</span>}
                {isDetached  && <span className="text-[8px] ml-0.5 opacity-60">win</span>}
              </button>

              {/* Float / detach mini buttons — always visible */}
              {!isHidden && !isDetached && (
                <div className="flex">
                  <button
                    onClick={() => floatPanel(id)}
                    title={`Float ${short}`}
                    className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <SquareDashed className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => detachPanel(id)}
                    title={`Detach ${short} to new window`}
                    className="h-5 w-5 flex items-center justify-center rounded-r text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
              {isDetached && (
                <button
                  onClick={() => detachPanel(id)}
                  title="Re-open window"
                  className="h-5 w-5 flex items-center justify-center rounded-r text-emerald-600 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
