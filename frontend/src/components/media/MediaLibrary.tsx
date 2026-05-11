import { useCallback, useRef, useState } from 'react'
import { Upload, FolderOpen, Search, Trash2, Film, Music, FileImage, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { uploadMedia, importMediaByPath, deleteMedia } from '@/lib/api'
import { formatDuration, formatBytes, cn, codecBadgeColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MediaItem } from '@/types'

function MediaIcon({ item }: { item: MediaItem }) {
  if (!item.video_codec) return <Music className="h-4 w-4 text-purple-400" />
  if (!item.duration && item.width) return <FileImage className="h-4 w-4 text-yellow-400" />
  return <Film className="h-4 w-4 text-blue-400" />
}

function MediaCard({ item, selected, onClick, onDelete }: {
  item: MediaItem
  selected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-lg border cursor-pointer overflow-hidden transition-all',
        selected
          ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/30'
          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-800/60'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
        {item.thumbnail_path ? (
          <img
            src={`/thumbnails/${item.id}.jpg`}
            alt={item.filename}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <MediaIcon item={item} />
        )}
        {item.duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-mono text-white">
            {formatDuration(item.duration)}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center rounded bg-black/60 p-0.5 text-zinc-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-zinc-200 truncate leading-tight" title={item.filename}>
          {item.filename}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {item.video_codec && (
            <span className={cn('rounded px-1 py-0.5 text-[9px] font-medium text-white uppercase', codecBadgeColor(item.video_codec))}>
              {item.video_codec}
            </span>
          )}
          {item.width && item.height && (
            <span className="rounded bg-zinc-700 px-1 py-0.5 text-[9px] text-zinc-300">
              {item.width}×{item.height}
            </span>
          )}
          {item.fps && (
            <span className="rounded bg-zinc-700 px-1 py-0.5 text-[9px] text-zinc-300">
              {item.fps.toFixed(2)}fps
            </span>
          )}
        </div>
        <p className="text-[9px] text-zinc-500">{formatBytes(item.size_bytes)}</p>
      </div>
    </div>
  )
}

export function MediaLibrary() {
  const { mediaItems, addMediaItem, removeMediaItem, selectedMediaId, setSelectedMediaId, activeProject } = useAppStore()
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const [showPathInput, setShowPathInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = mediaItems.filter(m =>
    m.filename.toLowerCase().includes(search.toLowerCase())
  )

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !activeProject) return
    setImporting(true)
    try {
      for (const file of Array.from(files)) {
        const item = await uploadMedia(activeProject.id, file)
        addMediaItem(item)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setImporting(false)
    }
  }, [activeProject, addMediaItem])

  const handleImportPath = useCallback(async () => {
    if (!pathInput.trim() || !activeProject) return
    setImporting(true)
    try {
      const item = await importMediaByPath(activeProject.id, pathInput.trim())
      addMediaItem(item)
      setPathInput('')
      setShowPathInput(false)
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setImporting(false)
    }
  }, [pathInput, activeProject, addMediaItem])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMedia(id)
      removeMediaItem(id)
      if (selectedMediaId === id) setSelectedMediaId(null)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }, [removeMediaItem, selectedMediaId, setSelectedMediaId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Media Library</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPathInput(v => !v)}
            title="Import from path"
            disabled={!activeProject}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
            disabled={!activeProject || importing}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Path import input */}
      {showPathInput && (
        <div className="px-3 py-2 border-b border-zinc-800 space-y-1.5">
          <Input
            value={pathInput}
            onChange={e => setPathInput(e.target.value)}
            placeholder="C:\Videos\clip.mp4"
            onKeyDown={e => e.key === 'Enter' && handleImportPath()}
          />
          <div className="flex gap-1">
            <Button size="sm" variant="primary" onClick={handleImportPath} disabled={importing || !pathInput.trim()}>
              Import
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPathInput(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search media..."
            className="pl-6"
          />
        </div>
      </div>

      {/* Media grid */}
      <div
        className="flex-1 overflow-y-auto p-2"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {!activeProject ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <Film className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-500">No project open</p>
            <p className="text-[10px] text-zinc-600">Create a project to get started</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 border-2 border-dashed border-zinc-800 rounded-xl m-2 py-8">
            <Upload className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-500">Drop files here or use Import</p>
            <p className="text-[10px] text-zinc-600">MP4, MOV, MKV, MP3, WAV, FLAC...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                selected={item.id === selectedMediaId}
                onClick={() => setSelectedMediaId(item.id)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={e => handleFileUpload(e.target.files)}
      />

      {/* Count */}
      <div className="px-3 py-1.5 border-t border-zinc-800">
        <span className="text-[10px] text-zinc-600">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
