/**
 * Wraps any panel and adds a thin control strip:
 * [float] [detach to window] [hide]
 * The strip sits at the very top-right of the existing panel header area.
 */
import { Minus, ExternalLink, SquareDashed } from 'lucide-react'
import { usePanelStore, type PanelId } from '@/store/panelStore'
import { cn } from '@/lib/utils'

interface PanelFrameProps {
  panelId: PanelId
  children: React.ReactNode
  className?: string
}

export function PanelFrame({ panelId, children, className }: PanelFrameProps) {
  const { floatPanel, detachPanel, hidePanel } = usePanelStore()

  return (
    <div className={cn('relative flex flex-col h-full group/frame', className)}>
      {/* Panel controls — appear at the very top-right of whatever header the child renders */}
      <div className="absolute top-0 right-0 z-20 flex items-center gap-0 opacity-0 group-hover/frame:opacity-100 transition-opacity duration-150 pointer-events-none group-hover/frame:pointer-events-auto">
        <PanelBtn
          onClick={() => floatPanel(panelId)}
          title="Float panel (overlay)"
          icon={<SquareDashed className="h-3 w-3" />}
        />
        <PanelBtn
          onClick={() => detachPanel(panelId)}
          title="Detach to new window"
          icon={<ExternalLink className="h-3 w-3" />}
        />
        <PanelBtn
          onClick={() => hidePanel(panelId)}
          title="Hide panel"
          icon={<Minus className="h-3 w-3" />}
        />
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  )
}

function PanelBtn({
  onClick, title, icon,
}: {
  onClick: () => void
  title: string
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
    >
      {icon}
    </button>
  )
}
