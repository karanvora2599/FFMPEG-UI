import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
}

const variantStyles: Record<string, string> = {
  default: 'bg-zinc-700 text-zinc-200',
  success: 'bg-emerald-800 text-emerald-200',
  error: 'bg-red-900 text-red-200',
  warning: 'bg-amber-800 text-amber-200',
  info: 'bg-blue-900 text-blue-200',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
