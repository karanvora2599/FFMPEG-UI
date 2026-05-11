/**
 * Renders all currently-floating panels as draggable, resizable overlays
 * at the root level of the app (position: fixed).
 */
import { useRef, useCallback, type MouseEvent as RMouseEvent } from 'react'
import { X, Minus, Maximize2, ExternalLink, GripVertical } from 'lucide-react'
import { usePanelStore, type PanelId } from '@/store/panelStore'
import { cn } from '@/lib/utils'

// Panel content map — imported lazily to avoid circular deps
import { MediaLibrary }    from '@/components/media/MediaLibrary'
import { PreviewMonitor }  from '@/components/preview/PreviewMonitor'
import { Inspector }       from '@/components/inspector/Inspector'
import { JobsPanel }       from '@/components/jobs/JobsPanel'
import { NodeGraph }       from '@/components/nodes/NodeGraph'
import { Timeline }        from '@/components/timeline/Timeline'

const PANEL_CONTENT: Record<PanelId, React.ComponentType> = {
  media:     MediaLibrary,
  preview:   PreviewMonitor,
  inspector: Inspector,
  jobs:      JobsPanel,
  nodes:     NodeGraph,
  timeline:  Timeline,
}

// ─── Single floating panel ─────────────────────────────────────────────────────

function FloatingPanel({ panelId }: { panelId: PanelId }) {
  const { panels, dockPanel, detachPanel, hidePanel, updateFloating, bringToFront, toggleMinimize } =
    usePanelStore()
  const panel = panels[panelId]
  const { x, y, width, height, zIndex, minimized } = panel.floating

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const onDragStart = useCallback((e: RMouseEvent) => {
    e.preventDefault()
    bringToFront(panelId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const nx = dragRef.current.origX + ev.clientX - dragRef.current.startX
      const ny = dragRef.current.origY + ev.clientY - dragRef.current.startY
      updateFloating(panelId, {
        x: Math.max(0, nx),
        y: Math.max(0, ny),
      })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [x, y, panelId, bringToFront, updateFloating])

  const Content = PANEL_CONTENT[panelId]

  return (
    <div
      style={{ left: x, top: y, width, height: minimized ? 'auto' : height, zIndex }}
      className={cn(
        'fixed flex flex-col rounded-xl border border-zinc-700 shadow-2xl overflow-hidden',
        'bg-zinc-950 ring-1 ring-white/5',
      )}
      onMouseDown={() => bringToFront(panelId)}
    >
      {/* Title bar */}
      <div
        className="flex items-center h-8 shrink-0 px-2 gap-1.5 bg-zinc-900 border-b border-zinc-800 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
      >
        <GripVertical className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        <span className="flex-1 text-xs font-medium text-zinc-300 truncate">{panel.label}</span>

        {/* Controls */}
        <FloatCtrl onClick={() => detachPanel(panelId)} title="Detach to window">
          <ExternalLink className="h-3 w-3" />
        </FloatCtrl>
        <FloatCtrl onClick={() => dockPanel(panelId)} title="Dock back">
          <Maximize2 className="h-3 w-3" />
        </FloatCtrl>
        <FloatCtrl onClick={() => toggleMinimize(panelId)} title={minimized ? 'Restore' : 'Minimise'}>
          <Minus className="h-3 w-3" />
        </FloatCtrl>
        <FloatCtrl onClick={() => hidePanel(panelId)} title="Close" danger>
          <X className="h-3 w-3" />
        </FloatCtrl>
      </div>

      {/* Body */}
      {!minimized && (
        <div
          className="flex-1 min-h-0 relative"
          style={{ resize: 'both', overflow: 'hidden' }}
          onMouseUp={(e) => {
            // Capture resize (CSS resize changes offsetWidth/Height)
            const el = e.currentTarget
            const newW = el.offsetWidth
            const newH = el.offsetHeight + 32 // +titlebar
            if (Math.abs(newW - width) > 2 || Math.abs(newH - height) > 2) {
              updateFloating(panelId, { width: newW, height: newH })
            }
          }}
        >
          <Content />
        </div>
      )}
    </div>
  )
}

function FloatCtrl({
  onClick, title, danger = false, children,
}: {
  onClick: () => void
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={title}
      className={cn(
        'h-5 w-5 flex items-center justify-center rounded transition-colors',
        danger
          ? 'text-zinc-500 hover:bg-red-700 hover:text-white'
          : 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200',
      )}
    >
      {children}
    </button>
  )
}

// ─── Host: renders all floating panels ────────────────────────────────────────

export function FloatingPanelHost() {
  const { panels } = usePanelStore()

  const floatingIds = (Object.keys(panels) as PanelId[]).filter(
    id => panels[id].mode === 'floating',
  )

  if (floatingIds.length === 0) return null

  return (
    <>
      {floatingIds.map(id => (
        <FloatingPanel key={id} panelId={id} />
      ))}
    </>
  )
}
