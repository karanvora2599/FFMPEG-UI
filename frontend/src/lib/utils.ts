import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let idx = 0
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx++
  }
  return `${size.toFixed(1)} ${units[idx]}`
}

export function formatBitrate(bps: number | null | undefined): string {
  if (!bps) return '—'
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  if (bps >= 1000) return `${(bps / 1000).toFixed(0)} kbps`
  return `${bps} bps`
}

export function formatResolution(w: number | null, h: number | null): string {
  if (!w || !h) return '—'
  return `${w}×${h}`
}

export function formatEta(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function codecBadgeColor(codec: string | null | undefined): string {
  if (!codec) return 'bg-zinc-700'
  const c = codec.toLowerCase()
  if (c.includes('h264') || c.includes('avc')) return 'bg-blue-700'
  if (c.includes('h265') || c.includes('hevc')) return 'bg-purple-700'
  if (c.includes('av1')) return 'bg-emerald-700'
  if (c.includes('vp9')) return 'bg-teal-700'
  if (c.includes('prores')) return 'bg-amber-700'
  return 'bg-zinc-600'
}
