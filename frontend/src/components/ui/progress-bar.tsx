import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  showLabel?: boolean
  color?: string
}

export function ProgressBar({ value, className, showLabel = false, color = 'bg-blue-500' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('relative h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', color)}
        style={{ width: `${pct}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
