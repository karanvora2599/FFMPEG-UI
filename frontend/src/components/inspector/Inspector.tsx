import { useState, useEffect } from 'react'
import { Settings, Zap, Play, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createJob, startJob, getPresets } from '@/lib/api'
import { formatDuration, formatBytes, formatBitrate, formatResolution } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { JobSettings, PresetMap } from '@/types'

const CODEC_OPTIONS = [
  { value: 'h264_nvenc', label: 'H.264 NVENC (GPU)' },
  { value: 'hevc_nvenc', label: 'H.265 NVENC (GPU)' },
  { value: 'av1_nvenc', label: 'AV1 NVENC (GPU)' },
  { value: 'libx264', label: 'H.264 (CPU)' },
  { value: 'libx265', label: 'H.265 (CPU)' },
  { value: 'prores_ks', label: 'ProRes (CPU)' },
  { value: 'copy', label: 'Copy (no transcode)' },
]

const AUDIO_CODEC_OPTIONS = [
  { value: 'aac', label: 'AAC' },
  { value: 'libmp3lame', label: 'MP3' },
  { value: 'opus', label: 'Opus' },
  { value: 'pcm_s16le', label: 'WAV PCM' },
  { value: 'copy', label: 'Copy' },
]

const CONTAINER_OPTIONS = ['mp4', 'mkv', 'mov', 'webm', 'mp3', 'm4a', 'wav']

export function Inspector() {
  const { mediaItems, selectedMediaId, activeProject, ffmpegStatus, upsertJob, setSelectedJobId, setActivePanel } = useAppStore()
  const selectedMedia = mediaItems.find(m => m.id === selectedMediaId)

  const [presets, setPresets] = useState<PresetMap>({})
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [settings, setSettings] = useState<JobSettings>({
    use_gpu: true,
    video_codec: 'h264_nvenc',
    audio_codec: 'aac',
    video_bitrate: '8M',
    audio_bitrate: '192k',
    nvenc_preset: 'p5',
    container: 'mp4',
  })
  const [outputFilename, setOutputFilename] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getPresets().then(setPresets).catch(console.error)
  }, [])

  // Adjust codec when GPU availability changes
  useEffect(() => {
    if (ffmpegStatus && !ffmpegStatus.any_nvenc_available) {
      setSettings(s => ({
        ...s,
        video_codec: 'libx264',
        use_gpu: false,
      }))
    }
  }, [ffmpegStatus])

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId)
    if (presets[presetId]) {
      setSettings(prev => ({ ...prev, ...presets[presetId] }))
    }
  }

  const update = (patch: Partial<JobSettings>) => {
    setSettings(s => ({ ...s, ...patch }))
    setSelectedPreset('')
  }

  const handleSubmitJob = async () => {
    if (!selectedMedia || !activeProject) return
    setSubmitting(true)
    try {
      const job = await createJob({
        project_id: activeProject.id,
        name: outputFilename || selectedMedia.filename,
        input_media_ids: [selectedMedia.id],
        settings,
        output_filename: outputFilename || undefined,
        preset_id: selectedPreset || undefined,
      })
      upsertJob(job)
      // Auto-start the job
      const started = await startJob(job.id)
      upsertJob(started)
      setSelectedJobId(job.id)
      setActivePanel('jobs')
    } catch (err) {
      console.error('Job creation failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <Settings className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Inspector</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedMedia ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-4">
            <Settings className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-500">Select a media file</p>
            <p className="text-[10px] text-zinc-600">Choose from the media library to configure export settings</p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Media info */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Source</h3>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 space-y-1.5">
                <p className="text-xs font-medium text-zinc-200 truncate">{selectedMedia.filename}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <InfoRow label="Duration" value={formatDuration(selectedMedia.duration)} />
                  <InfoRow label="Resolution" value={formatResolution(selectedMedia.width, selectedMedia.height)} />
                  <InfoRow label="FPS" value={selectedMedia.fps ? `${selectedMedia.fps.toFixed(2)}` : '—'} />
                  <InfoRow label="Video" value={selectedMedia.video_codec ?? '—'} />
                  <InfoRow label="Audio" value={selectedMedia.audio_codec ?? '—'} />
                  <InfoRow label="Size" value={formatBytes(selectedMedia.size_bytes)} />
                  <InfoRow label="Bitrate" value={formatBitrate(selectedMedia.bit_rate)} />
                  <InfoRow label="Container" value={selectedMedia.container ?? '—'} />
                </div>
              </div>
            </section>

            {/* Preset selector */}
            <section>
              <Label>Preset</Label>
              <Select value={selectedPreset} onChange={e => applyPreset(e.target.value)}>
                <option value="">— Custom —</option>
                {Object.entries(presets).map(([id, p]) => (
                  <option key={id} value={id}>{p.label}</option>
                ))}
              </Select>
            </section>

            {/* Video settings */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Video</h3>
              <div className="space-y-2">
                <div>
                  <Label>Codec</Label>
                  <Select value={settings.video_codec ?? ''} onChange={e => update({ video_codec: e.target.value })}>
                    {CODEC_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>

                {settings.video_codec?.endsWith('_nvenc') ? (
                  <div>
                    <Label>NVENC Preset</Label>
                    <Select value={settings.nvenc_preset ?? 'p5'} onChange={e => update({ nvenc_preset: e.target.value })}>
                      <option value="p1">P1 - Fastest</option>
                      <option value="p3">P3 - Fast</option>
                      <option value="p5">P5 - Balanced</option>
                      <option value="p7">P7 - Quality</option>
                    </Select>
                  </div>
                ) : settings.video_codec === 'libx264' || settings.video_codec === 'libx265' ? (
                  <div>
                    <Label>CRF (Quality)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={51}
                        value={settings.crf ?? 23}
                        onChange={e => update({ crf: Number(e.target.value) })}
                        className="flex-1 accent-blue-500"
                      />
                      <span className="text-xs font-mono text-zinc-300 w-6 text-right">{settings.crf ?? 23}</span>
                    </div>
                  </div>
                ) : null}

                {settings.video_codec !== 'copy' && !settings.extract_audio_only && (
                  <div>
                    <Label>Bitrate</Label>
                    <Input
                      value={settings.video_bitrate ?? ''}
                      onChange={e => update({ video_bitrate: e.target.value })}
                      placeholder="e.g. 8M"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={settings.output_width ?? ''}
                      onChange={e => update({ output_width: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="1920"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={settings.output_height ?? ''}
                      onChange={e => update({ output_height: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="1080"
                    />
                  </div>
                </div>

                <div>
                  <Label>FPS</Label>
                  <Input
                    type="number"
                    value={settings.output_fps ?? ''}
                    onChange={e => update({ output_fps: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Keep original"
                  />
                </div>
              </div>
            </section>

            {/* Trim */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Trim</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start (s)</Label>
                  <Input
                    type="number"
                    value={settings.trim_start ?? ''}
                    onChange={e => update({ trim_start: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>End (s)</Label>
                  <Input
                    type="number"
                    value={settings.trim_end ?? ''}
                    onChange={e => update({ trim_end: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="End"
                  />
                </div>
              </div>
            </section>

            {/* Audio settings */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Audio</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="audio-only"
                    checked={!!settings.extract_audio_only}
                    onChange={e => update({ extract_audio_only: e.target.checked })}
                    className="accent-blue-500"
                  />
                  <label htmlFor="audio-only" className="text-xs text-zinc-300 cursor-pointer">Audio Only</label>
                </div>
                <div>
                  <Label>Codec</Label>
                  <Select value={settings.audio_codec ?? 'aac'} onChange={e => update({ audio_codec: e.target.value })}>
                    {AUDIO_CODEC_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Bitrate</Label>
                  <Input
                    value={settings.audio_bitrate ?? ''}
                    onChange={e => update({ audio_bitrate: e.target.value })}
                    placeholder="192k"
                  />
                </div>
              </div>
            </section>

            {/* Output */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Output</h3>
              <div className="space-y-2">
                <div>
                  <Label>Container</Label>
                  <Select value={settings.container ?? 'mp4'} onChange={e => update({ container: e.target.value })}>
                    {CONTAINER_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Filename (optional)</Label>
                  <Input
                    value={outputFilename}
                    onChange={e => setOutputFilename(e.target.value)}
                    placeholder="output_name"
                  />
                </div>
              </div>
            </section>

            {/* GPU toggle */}
            <section>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                <Zap className={`h-3.5 w-3.5 ${settings.use_gpu ? 'text-green-400' : 'text-zinc-600'}`} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-300">GPU Acceleration</p>
                  <p className="text-[10px] text-zinc-500">
                    {ffmpegStatus?.gpu_name ?? 'No GPU detected'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.use_gpu}
                  onChange={e => update({ use_gpu: e.target.checked })}
                  disabled={!ffmpegStatus?.any_nvenc_available}
                  className="accent-blue-500 h-4 w-4 cursor-pointer"
                />
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Action */}
      {selectedMedia && activeProject && (
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmitJob}
            disabled={submitting}
          >
            <Play className="h-3.5 w-3.5" />
            {submitting ? 'Creating Job...' : 'Export & Run'}
          </Button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</span>
      <p className="text-[11px] text-zinc-300 font-mono truncate">{value}</p>
    </div>
  )
}
