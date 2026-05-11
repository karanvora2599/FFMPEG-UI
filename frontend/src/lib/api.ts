import axios from 'axios'
import type { FFmpegStatus, Job, JobSettings, MediaItem, PresetMap, Project } from '@/types'

const api = axios.create({ baseURL: '/api' })

// System
export const getFFmpegStatus = () =>
  api.get<FFmpegStatus>('/system/ffmpeg-status').then(r => r.data)

export const getPresets = () =>
  api.get<PresetMap>('/system/presets').then(r => r.data)

// Projects
export const createProject = (name: string, description = '') =>
  api.post<Project>('/projects', { name, description }).then(r => r.data)

export const listProjects = () =>
  api.get<Project[]>('/projects').then(r => r.data)

export const getProject = (id: string) =>
  api.get<Project>(`/projects/${id}`).then(r => r.data)

// Media
export const importMediaByPath = (project_id: string, file_path: string) =>
  api.post<MediaItem>('/media/import', { project_id, file_path }).then(r => r.data)

export const uploadMedia = (project_id: string, file: File) => {
  const form = new FormData()
  form.append('project_id', project_id)
  form.append('file', file)
  return api.post<MediaItem>('/media/upload', form).then(r => r.data)
}

export const listMedia = (project_id?: string) =>
  api.get<MediaItem[]>('/media', { params: project_id ? { project_id } : {} }).then(r => r.data)

export const getMedia = (id: string) =>
  api.get<MediaItem>(`/media/${id}`).then(r => r.data)

export const deleteMedia = (id: string) =>
  api.delete(`/media/${id}`).then(r => r.data)

// Jobs
export interface CreateJobPayload {
  project_id: string
  name?: string
  input_media_ids: string[]
  settings: JobSettings
  output_filename?: string
  preset_id?: string
  node_graph?: unknown[]
}

export const createJob = (payload: CreateJobPayload) =>
  api.post<Job>('/jobs', { ...payload, name: payload.name ?? '' }).then(r => r.data)

export const listJobs = (project_id?: string) =>
  api.get<Job[]>('/jobs', { params: project_id ? { project_id } : {} }).then(r => r.data)

export const getJob = (id: string) =>
  api.get<Job>(`/jobs/${id}`).then(r => r.data)

export const startJob = (id: string) =>
  api.post<Job>(`/jobs/${id}/start`).then(r => r.data)

export const cancelJob = (id: string) =>
  api.post<Job>(`/jobs/${id}/cancel`).then(r => r.data)

export const deleteJob = (id: string) =>
  api.delete(`/jobs/${id}`).then(r => r.data)

// WebSocket URL
export const getJobWsUrl = (jobId: string) => {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws/jobs/${jobId}`
}
