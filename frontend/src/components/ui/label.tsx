import { cn } from '@/lib/utils'
import { type LabelHTMLAttributes } from 'react'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1', className)}
      {...props}
    />
  )
}
