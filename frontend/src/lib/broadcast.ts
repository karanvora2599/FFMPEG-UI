/**
 * BroadcastChannel-based state sync across windows (detached panels, multi-monitor).
 * Each window gets a UUID; messages tagged with sender are ignored by the sender itself.
 */
import { useEffect } from 'react'
import type { FFmpegStatus, Job, MediaItem, Project } from '@/types'

export const WINDOW_ID = Math.random().toString(36).slice(2, 10)
const CHANNEL = 'gpu-media-forge'

type SyncPayload = {
  mediaItems?: MediaItem[]
  jobs?: Job[]
  selectedMediaId?: string | null
  activeProject?: Project | null
  ffmpegStatus?: FFmpegStatus | null
}

type BroadcastMsg =
  | { type: 'state-patch'; sender: string; payload: SyncPayload }
  | { type: 'request-state'; sender: string }
  | { type: 'state-dump'; target: string; sender: string; payload: SyncPayload }

let _channel: BroadcastChannel | null = null

function ch(): BroadcastChannel {
  if (!_channel) _channel = new BroadcastChannel(CHANNEL)
  return _channel
}

export function broadcastPatch(payload: SyncPayload) {
  ch().postMessage({ type: 'state-patch', sender: WINDOW_ID, payload } satisfies BroadcastMsg)
}

export function broadcastRequestState() {
  ch().postMessage({ type: 'request-state', sender: WINDOW_ID } satisfies BroadcastMsg)
}

function broadcastDump(target: string, payload: SyncPayload) {
  ch().postMessage({ type: 'state-dump', target, sender: WINDOW_ID, payload } satisfies BroadcastMsg)
}

/** Hook: call once at root level. Keeps all windows in sync. */
export function useBroadcastSync(getSnapshot: () => SyncPayload, applyPatch: (p: SyncPayload) => void) {
  useEffect(() => {
    const channel = ch()

    const handler = (ev: MessageEvent<BroadcastMsg>) => {
      const msg = ev.data
      if (msg.sender === WINDOW_ID) return // ignore own messages

      if (msg.type === 'state-patch') {
        applyPatch(msg.payload)
      } else if (msg.type === 'request-state') {
        // Another window (newly opened detached panel) wants current state
        broadcastDump(msg.sender, getSnapshot())
      } else if (msg.type === 'state-dump' && msg.target === WINDOW_ID) {
        applyPatch(msg.payload)
      }
    }

    channel.addEventListener('message', handler)
    return () => channel.removeEventListener('message', handler)
  }, [getSnapshot, applyPatch])
}
