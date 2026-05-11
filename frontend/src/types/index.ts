export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  project_id: string
  original_path: string
  stored_path: string
  filename: string
  duration: number | null
  width: number | null
  height: number | null
  fps: number | null
  video_codec: string | null
  audio_codec: string | null
  container: string | null
  size_bytes: number
  bit_rate: number | null
  thumbnail_path: string | null
  created_at: string
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'

export interface Job {
  id: string
  project_id: string
  name: string
  status: JobStatus
  input_media_ids: string[] | null
  output_path: string | null
  ffmpeg_args_json: string[] | null
  generated_command_preview: string | null
  settings_json: Record<string, unknown> | null
  progress: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
}

export interface FFmpegStatus {
  ffmpeg_found: boolean
  ffprobe_found: boolean
  ffmpeg_path: string | null
  ffprobe_path: string | null
  ffmpeg_version: string | null
  gpu_name: string | null
  gpu_detected: boolean
  cuda_available: boolean
  nvenc_encoders: Record<string, boolean>
  cuda_filters: Record<string, boolean>
  any_nvenc_available: boolean
  recommended_encoder: string
  hwaccel_methods: string[]
}

export interface JobSettings {
  use_gpu?: boolean
  video_codec?: string
  audio_codec?: string
  video_bitrate?: string
  audio_bitrate?: string
  nvenc_preset?: string
  crf?: number
  cpu_preset?: string
  output_width?: number
  output_height?: number
  output_fps?: number
  trim_start?: number
  trim_end?: number
  extract_audio_only?: boolean
  no_audio?: boolean
  container?: string
  cq?: number
}

export interface Preset {
  label: string
  use_gpu?: boolean
  video_codec?: string
  audio_codec?: string
  video_bitrate?: string
  audio_bitrate?: string
  output_width?: number
  output_height?: number
  nvenc_preset?: string
  container?: string
  extract_audio_only?: boolean
  crf?: number
  cpu_preset?: string
  prores_profile?: number
}

export type PresetMap = Record<string, Preset>

export interface ProgressUpdate {
  type: 'progress' | 'log' | 'complete' | 'canceled' | 'pong'
  data: {
    current_time?: number
    current_time_str?: string
    percent?: number
    speed?: number
    bitrate?: string
    size?: string
    frame?: number
    fps?: number
    eta_seconds?: number
    raw?: string
    success?: boolean
    error?: string
  } | string
}
