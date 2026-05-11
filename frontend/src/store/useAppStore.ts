import { create } from 'zustand'
import type { FFmpegStatus, Job, MediaItem, Project } from '@/types'

interface AppState {
  // System
  ffmpegStatus: FFmpegStatus | null
  setFFmpegStatus: (s: FFmpegStatus) => void

  // Active project
  activeProject: Project | null
  setActiveProject: (p: Project | null) => void

  // Media library
  mediaItems: MediaItem[]
  setMediaItems: (items: MediaItem[]) => void
  addMediaItem: (item: MediaItem) => void
  removeMediaItem: (id: string) => void

  // Selected media (for preview / inspector)
  selectedMediaId: string | null
  setSelectedMediaId: (id: string | null) => void

  // Jobs
  jobs: Job[]
  setJobs: (jobs: Job[]) => void
  upsertJob: (job: Job) => void
  updateJobProgress: (id: string, progress: number) => void
  removeJob: (id: string) => void

  // Active job tab / selected job
  selectedJobId: string | null
  setSelectedJobId: (id: string | null) => void

  // Job logs: jobId -> string[]
  jobLogs: Record<string, string[]>
  appendJobLog: (jobId: string, line: string) => void
  clearJobLogs: (jobId: string) => void

  // UI panels
  activePanel: 'timeline' | 'nodes' | 'jobs'
  setActivePanel: (p: 'timeline' | 'nodes' | 'jobs') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  ffmpegStatus: null,
  setFFmpegStatus: (s) => set({ ffmpegStatus: s }),

  activeProject: null,
  setActiveProject: (p) => set({ activeProject: p }),

  mediaItems: [],
  setMediaItems: (items) => set({ mediaItems: items }),
  addMediaItem: (item) => set(s => ({ mediaItems: [item, ...s.mediaItems] })),
  removeMediaItem: (id) => set(s => ({ mediaItems: s.mediaItems.filter(m => m.id !== id) })),

  selectedMediaId: null,
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),

  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  upsertJob: (job) =>
    set(s => {
      const idx = s.jobs.findIndex(j => j.id === job.id)
      if (idx >= 0) {
        const updated = [...s.jobs]
        updated[idx] = job
        return { jobs: updated }
      }
      return { jobs: [job, ...s.jobs] }
    }),
  updateJobProgress: (id, progress) =>
    set(s => ({
      jobs: s.jobs.map(j => (j.id === id ? { ...j, progress } : j)),
    })),
  removeJob: (id) => set(s => ({ jobs: s.jobs.filter(j => j.id !== id) })),

  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),

  jobLogs: {},
  appendJobLog: (jobId, line) =>
    set(s => {
      const existing = s.jobLogs[jobId] ?? []
      // Cap at 500 lines
      const trimmed = existing.length >= 500 ? existing.slice(-499) : existing
      return { jobLogs: { ...s.jobLogs, [jobId]: [...trimmed, line] } }
    }),
  clearJobLogs: (jobId) =>
    set(s => ({ jobLogs: { ...s.jobLogs, [jobId]: [] } })),

  activePanel: 'jobs',
  setActivePanel: (p) => set({ activePanel: p }),
}))
