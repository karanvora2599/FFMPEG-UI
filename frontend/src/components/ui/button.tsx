import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'primary'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const variantStyles: Record<string, string> = {
  default: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
  ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100',
  outline: 'border border-zinc-600 hover:bg-zinc-800 text-zinc-300',
  destructive: 'bg-red-900 hover:bg-red-800 text-red-100',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
}

const sizeStyles: Record<string, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-sm',
  icon: 'p-1.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
