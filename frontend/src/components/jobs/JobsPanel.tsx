import { useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, X, Terminal, Folder, Copy, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cancelJob, deleteJob, startJob } from '@/lib/api'
import { getJobWsUrl } from '@/lib/api'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Button } from '@/components/ui/button'
import { cn, formatDuration } from '@/lib/utils'
import type { Job, ProgressUpdate } from '@/types'

const STATUS_ICON: Record<string, React.ReactNode> = {
  queued: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  canceled: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />,
}

const STATUS_COLOR: Record<string, string> = {
  queued: 'text-zinc-400',
  running: 'text-blue-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  canceled: 'text-amber-400',
}

function useJobWebSocket(jobId: string | null) {
  const { updateJobProgress, upsertJob, appendJobLog, jobs } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) return

    const job = jobs.find(j => j.id === jobId)
    if (!job || job.status !== 'running') return

    const ws = new WebSocket(getJobWsUrl(jobId))
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg: ProgressUpdate = JSON.parse(event.data)
        if (msg.type === 'progress' && typeof msg.data === 'object') {
          const d = msg.data
          if (d.percent != null) updateJobProgress(jobId, d.percent)
          if (d.raw) appendJobLog(jobId, d.raw)
        } else if (msg.type === 'log' && typeof msg.data === 'string') {
          appendJobLog(jobId, msg.data)
        } else if (msg.type === 'complete') {
          ws.close()
        }
      } catch {}
    }

    ws.onopen = () => {
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 15000)
    }

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current)
    }

    return () => {
      ws.close()
      if (pingRef.current) clearInterval(pingRef.current)
    }
  }, [jobId, jobs.find(j => j.id === jobId)?.status])

  return wsRef
}

function JobRow({ job, selected, onClick }: { job: Job; selected: boolean; onClick: () => void }) {
  const { upsertJob, removeJob } = useAppStore()

  const handleCancel = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await cancelJob(job.id)
      upsertJob(updated)
    } catch {}
  }, [job.id, upsertJob])

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteJob(job.id)
      removeJob(job.id)
    } catch {}
  }, [job.id, removeJob])

  const handleCopyPath = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (job.output_path) navigator.clipboard.writeText(job.output_path)
  }, [job.output_path])

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all',
        selected
          ? 'border-blue-600/60 bg-blue-950/20'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
      )}
    >
      <div className="flex items-center gap-2">
        {STATUS_ICON[job.status]}
        <span className="flex-1 text-xs font-medium text-zinc-200 truncate">{job.name}</span>
        <span className={cn('text-[10px] font-medium uppercase', STATUS_COLOR[job.status])}>
          {job.status}
        </span>
        <div className="flex items-center gap-1">
          {job.status === 'running' && (
            <Button variant="ghost" size="icon" onClick={handleCancel} title="Cancel">
              <X className="h-3 w-3" />
            </Button>
          )}
          {job.status === 'completed' && job.output_path && (
            <Button variant="ghost" size="icon" onClick={handleCopyPath} title="Copy path">
              <Copy className="h-3 w-3" />
            </Button>
          )}
          {(job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') && (
            <Button variant="ghost" size="icon" onClick={handleDelete} title="Remove">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {job.status === 'running' && (
        <div className="space-y-0.5">
          <ProgressBar value={job.progress} color="bg-blue-500" />
          <span className="text-[9px] font-mono text-zinc-500">{job.progress.toFixed(1)}%</span>
        </div>
      )}

      {job.status === 'completed' && (
        <ProgressBar value={100} color="bg-emerald-500" />
      )}

      {job.status === 'failed' && job.error_message && (
        <p className="text-[10px] text-red-400 truncate">{job.error_message.substring(0, 80)}</p>
      )}
    </div>
  )
}

function LogViewer({ jobId }: { jobId: string }) {
  const { jobLogs, jobs } = useAppStore()
  const logs = jobLogs[jobId] ?? []
  const job = jobs.find(j => j.id === jobId)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800">
        <Terminal className="h-3 w-3 text-zinc-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">FFmpeg Output</span>
        {job && (
          <span className="text-[10px] text-zinc-600 truncate">{job.name}</span>
        )}
      </div>

      {job?.generated_command_preview && (
        <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50">
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Command</p>
          <code className="text-[10px] text-green-400 font-mono break-all leading-relaxed">
            {job.generated_command_preview}
          </code>
        </div>
      )}

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[10px] text-zinc-400 leading-relaxed space-y-0.5"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600 italic">Waiting for output...</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className={cn(
              'break-all',
              line.includes('Error') || line.includes('error') ? 'text-red-400' :
              line.includes('warning') || line.includes('Warning') ? 'text-amber-400' :
              'text-zinc-400'
            )}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function JobsPanel() {
  const { jobs, selectedJobId, setSelectedJobId } = useAppStore()

  // Attach WebSocket to running selected job
  useJobWebSocket(selectedJobId)

  // Auto-select first running job
  useEffect(() => {
    const running = jobs.find(j => j.status === 'running')
    if (running && !selectedJobId) {
      setSelectedJobId(running.id)
    }
  }, [jobs])

  return (
    <div className="flex h-full border-t border-zinc-800">
      {/* Job list */}
      <div className="w-72 shrink-0 flex flex-col border-r border-zinc-800">
        <div className="flex items-center px-3 py-2 border-b border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Jobs</span>
          <span className="ml-auto text-[10px] text-zinc-600">{jobs.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Folder className="h-6 w-6 text-zinc-700" />
              <p className="text-xs text-zinc-600">No jobs yet</p>
            </div>
          ) : (
            jobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                selected={job.id === selectedJobId}
                onClick={() => setSelectedJobId(job.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Log viewer */}
      <div className="flex-1 min-w-0">
        {selectedJobId ? (
          <LogViewer jobId={selectedJobId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-600">Select a job to view logs</p>
          </div>
        )}
      </div>
    </div>
  )
}
