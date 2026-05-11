import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  BackgroundVariant,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Play, Plus, Zap, X, Trash2, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createJob, startJob } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeData = Record<string, unknown>
type FlowNode = Node<NodeData>

// ─── Colors ───────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, { border: string; bg: string; handle: string }> = {
  InputNode:          { border: 'border-blue-600',   bg: 'bg-blue-950/50',   handle: '!bg-blue-500' },
  OutputNode:         { border: 'border-emerald-600', bg: 'bg-emerald-950/50',handle: '!bg-emerald-500' },
  EncodeNode:         { border: 'border-purple-600',  bg: 'bg-purple-950/50', handle: '!bg-purple-500' },
  TrimNode:           { border: 'border-amber-600',   bg: 'bg-amber-950/50',  handle: '!bg-amber-500' },
  ScaleNode:          { border: 'border-cyan-600',    bg: 'bg-cyan-950/50',   handle: '!bg-cyan-500' },
  FpsNode:            { border: 'border-indigo-600',  bg: 'bg-indigo-950/50', handle: '!bg-indigo-500' },
  CropNode:           { border: 'border-rose-600',    bg: 'bg-rose-950/50',   handle: '!bg-rose-500' },
  AudioNormalizeNode: { border: 'border-teal-600',    bg: 'bg-teal-950/50',   handle: '!bg-teal-500' },
  ColorAdjustNode:    { border: 'border-orange-600',  bg: 'bg-orange-950/50', handle: '!bg-orange-500' },
  DenoiseNode:        { border: 'border-pink-600',    bg: 'bg-pink-950/50',   handle: '!bg-pink-500' },
}

// ─── Shared node shell with delete button ─────────────────────────────────────

function NodeShell({
  id, nodeType, label, selected, children, showTarget = true, showSource = true,
}: {
  id: string
  nodeType: string
  label: string
  selected: boolean
  children?: React.ReactNode
  showTarget?: boolean
  showSource?: boolean
}) {
  const { deleteElements } = useReactFlow()
  const colors = NODE_COLORS[nodeType] ?? { border: 'border-zinc-700', bg: 'bg-zinc-900/60', handle: '!bg-zinc-500' }

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }, [id, deleteElements])

  return (
    <div className={cn(
      'min-w-[200px] rounded-lg border shadow-2xl',
      colors.border, colors.bg,
      selected && 'ring-2 ring-white/20'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-2.5 py-1.5 rounded-t-lg border-b',
        colors.border,
      )}>
        <span className="text-[11px] font-semibold text-zinc-100 tracking-wide">{label}</span>
        <button
          onClick={handleDelete}
          className="rounded p-0.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 transition-colors"
          title="Delete node"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Body */}
      <div className="px-2.5 py-2 space-y-1.5 nodrag">
        {children}
      </div>

      {showTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className={cn('!w-3 !h-3 !border-2 !border-zinc-900', colors.handle)}
        />
      )}
      {showSource && (
        <Handle
          type="source"
          position={Position.Right}
          className={cn('!w-3 !h-3 !border-2 !border-zinc-900', colors.handle)}
        />
      )}
    </div>
  )
}

// ─── Inline field components ───────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[9px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function NodeInput({
  value, onChange, type = 'text', placeholder = '', className = '',
}: {
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500',
        className
      )}
    />
  )
}

function NodeSelect({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function NodeToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="accent-blue-500 h-3 w-3"
      />
      <span className="text-[10px] text-zinc-400">{label}</span>
    </label>
  )
}

// ─── Node components ───────────────────────────────────────────────────────────

function InputNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  return (
    <NodeShell id={id} nodeType="InputNode" label="Input" selected={selected} showTarget={false}>
      <p className="text-[10px] text-zinc-400 truncate" title={String(data.filename ?? '')}>
        {String(data.filename ?? 'No file selected')}
      </p>
      <p className="text-[9px] text-zinc-600">Select media → click Sync Input</p>
    </NodeShell>
  )
}

function TrimNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="TrimNode" label="Trim" selected={selected}>
      <FieldRow label="Start (s)">
        <NodeInput
          type="number"
          value={String(data.start ?? 0)}
          onChange={v => upd({ start: v === '' ? 0 : Number(v) })}
          placeholder="0"
        />
      </FieldRow>
      <FieldRow label="End (s)">
        <NodeInput
          type="number"
          value={data.end != null ? String(data.end) : ''}
          onChange={v => upd({ end: v === '' ? null : Number(v) })}
          placeholder="End of file"
        />
      </FieldRow>
    </NodeShell>
  )
}

function ScaleNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="ScaleNode" label="Scale" selected={selected}>
      <FieldRow label="Width">
        <NodeInput type="number" value={String(data.width ?? 1920)} onChange={v => upd({ width: Number(v) || 1920 })} placeholder="1920" />
      </FieldRow>
      <FieldRow label="Height">
        <NodeInput type="number" value={String(data.height ?? 1080)} onChange={v => upd({ height: Number(v) || 1080 })} placeholder="1080" />
      </FieldRow>
      <NodeToggle
        label="CUDA Accelerated"
        value={Boolean(data.use_cuda)}
        onChange={v => upd({ use_cuda: v })}
      />
    </NodeShell>
  )
}

function FpsNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  return (
    <NodeShell id={id} nodeType="FpsNode" label="FPS" selected={selected}>
      <FieldRow label="FPS">
        <NodeSelect
          value={String(data.fps ?? 30)}
          onChange={v => updateNodeData(id, { fps: Number(v) })}
          options={[
            { value: '23.976', label: '23.976 (Cinema)' },
            { value: '24', label: '24' },
            { value: '25', label: '25 (PAL)' },
            { value: '29.97', label: '29.97 (NTSC)' },
            { value: '30', label: '30' },
            { value: '50', label: '50' },
            { value: '59.94', label: '59.94' },
            { value: '60', label: '60' },
            { value: '120', label: '120' },
          ]}
        />
      </FieldRow>
    </NodeShell>
  )
}

function CropNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="CropNode" label="Crop" selected={selected}>
      <div className="grid grid-cols-2 gap-1.5">
        <FieldRow label="W">
          <NodeInput type="number" value={String(data.w ?? 1920)} onChange={v => upd({ w: Number(v) || 1920 })} placeholder="1920" />
        </FieldRow>
        <FieldRow label="H">
          <NodeInput type="number" value={String(data.h ?? 1080)} onChange={v => upd({ h: Number(v) || 1080 })} placeholder="1080" />
        </FieldRow>
        <FieldRow label="X">
          <NodeInput type="number" value={String(data.x ?? 0)} onChange={v => upd({ x: Number(v) })} placeholder="0" />
        </FieldRow>
        <FieldRow label="Y">
          <NodeInput type="number" value={String(data.y ?? 0)} onChange={v => upd({ y: Number(v) })} placeholder="0" />
        </FieldRow>
      </div>
    </NodeShell>
  )
}

function EncodeNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  const codec = String(data.video_codec ?? 'h264_nvenc')
  const isNvenc = codec.endsWith('_nvenc')
  return (
    <NodeShell id={id} nodeType="EncodeNode" label="Encode" selected={selected}>
      <FieldRow label="Video">
        <NodeSelect
          value={codec}
          onChange={v => upd({ video_codec: v, use_gpu: v.endsWith('_nvenc') })}
          options={[
            { value: 'h264_nvenc', label: 'H.264 NVENC (GPU)' },
            { value: 'hevc_nvenc', label: 'H.265 NVENC (GPU)' },
            { value: 'av1_nvenc', label: 'AV1 NVENC (GPU)' },
            { value: 'libx264', label: 'H.264 (CPU)' },
            { value: 'libx265', label: 'H.265 (CPU)' },
            { value: 'copy', label: 'Copy (passthrough)' },
          ]}
        />
      </FieldRow>
      {isNvenc && (
        <FieldRow label="Preset">
          <NodeSelect
            value={String(data.nvenc_preset ?? 'p5')}
            onChange={v => upd({ nvenc_preset: v })}
            options={[
              { value: 'p1', label: 'P1 — Fastest' },
              { value: 'p3', label: 'P3 — Fast' },
              { value: 'p5', label: 'P5 — Balanced' },
              { value: 'p7', label: 'P7 — Quality' },
            ]}
          />
        </FieldRow>
      )}
      {codec !== 'copy' && (
        <FieldRow label="V Bitrate">
          <NodeInput value={String(data.video_bitrate ?? '8M')} onChange={v => upd({ video_bitrate: v })} placeholder="8M" />
        </FieldRow>
      )}
      <FieldRow label="Audio">
        <NodeSelect
          value={String(data.audio_codec ?? 'aac')}
          onChange={v => upd({ audio_codec: v })}
          options={[
            { value: 'aac', label: 'AAC' },
            { value: 'libmp3lame', label: 'MP3' },
            { value: 'opus', label: 'Opus' },
            { value: 'copy', label: 'Copy' },
          ]}
        />
      </FieldRow>
      <FieldRow label="A Bitrate">
        <NodeInput value={String(data.audio_bitrate ?? '192k')} onChange={v => upd({ audio_bitrate: v })} placeholder="192k" />
      </FieldRow>
      {isNvenc && (
        <div className="flex items-center gap-1 text-green-400 text-[10px]">
          <Zap className="h-3 w-3" />
          <span>GPU Accelerated</span>
        </div>
      )}
    </NodeShell>
  )
}

function OutputNodeComponent({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  return (
    <NodeShell id={id} nodeType="OutputNode" label="Output" selected={selected} showSource={false}>
      <FieldRow label="File">
        <NodeInput
          value={String(data.filename ?? 'output.mp4')}
          onChange={v => updateNodeData(id, { filename: v })}
          placeholder="output.mp4"
        />
      </FieldRow>
      <FieldRow label="Format">
        <NodeSelect
          value={String(data.container ?? 'mp4')}
          onChange={v => updateNodeData(id, { container: v })}
          options={[
            { value: 'mp4', label: 'MP4' },
            { value: 'mkv', label: 'MKV' },
            { value: 'mov', label: 'MOV' },
            { value: 'webm', label: 'WebM' },
          ]}
        />
      </FieldRow>
    </NodeShell>
  )
}

function AudioNormalizeNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="AudioNormalizeNode" label="Normalize Audio" selected={selected}>
      <FieldRow label="Target I">
        <NodeInput
          type="number"
          value={String(data.target_i ?? -16)}
          onChange={v => upd({ target_i: Number(v) })}
          placeholder="-16"
        />
      </FieldRow>
      <FieldRow label="True Peak">
        <NodeInput
          type="number"
          value={String(data.target_tp ?? -1.5)}
          onChange={v => upd({ target_tp: Number(v) })}
          placeholder="-1.5"
        />
      </FieldRow>
      <p className="text-[9px] text-zinc-600">EBU R128 loudnorm</p>
    </NodeShell>
  )
}

function ColorAdjustNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="ColorAdjustNode" label="Color Adjust" selected={selected}>
      <FieldRow label="Brightness">
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={-1} max={1} step={0.05}
            value={Number(data.brightness ?? 0)}
            onChange={e => upd({ brightness: Number(e.target.value) })}
            className="flex-1 accent-orange-500 h-1"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
            {Number(data.brightness ?? 0).toFixed(2)}
          </span>
        </div>
      </FieldRow>
      <FieldRow label="Contrast">
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={-1} max={1} step={0.05}
            value={Number(data.contrast ?? 0)}
            onChange={e => upd({ contrast: Number(e.target.value) })}
            className="flex-1 accent-orange-500 h-1"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
            {Number(data.contrast ?? 0).toFixed(2)}
          </span>
        </div>
      </FieldRow>
      <FieldRow label="Saturation">
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={0} max={3} step={0.05}
            value={Number(data.saturation ?? 1)}
            onChange={e => upd({ saturation: Number(e.target.value) })}
            className="flex-1 accent-orange-500 h-1"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
            {Number(data.saturation ?? 1).toFixed(2)}
          </span>
        </div>
      </FieldRow>
      <FieldRow label="Gamma">
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={0.1} max={3} step={0.05}
            value={Number(data.gamma ?? 1)}
            onChange={e => upd({ gamma: Number(e.target.value) })}
            className="flex-1 accent-orange-500 h-1"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
            {Number(data.gamma ?? 1).toFixed(2)}
          </span>
        </div>
      </FieldRow>
    </NodeShell>
  )
}

function DenoiseNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const upd = (patch: NodeData) => updateNodeData(id, patch)
  return (
    <NodeShell id={id} nodeType="DenoiseNode" label="Denoise" selected={selected}>
      <FieldRow label="Filter">
        <NodeSelect
          value={String(data.filter ?? 'hqdn3d')}
          onChange={v => upd({ filter: v })}
          options={[
            { value: 'hqdn3d', label: 'hqdn3d (fast)' },
            { value: 'nlmeans', label: 'nlmeans (quality)' },
          ]}
        />
      </FieldRow>
      <FieldRow label="Strength">
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={1} max={10} step={0.5}
            value={Number(data.strength ?? 3)}
            onChange={e => upd({ strength: Number(e.target.value) })}
            className="flex-1 accent-pink-500 h-1"
          />
          <span className="text-[10px] font-mono text-zinc-400 w-5 text-right">
            {Number(data.strength ?? 3).toFixed(1)}
          </span>
        </div>
      </FieldRow>
    </NodeShell>
  )
}

// ─── Custom deletable edge ─────────────────────────────────────────────────────

function DeletableEdge({
  id, sourceX, sourceY, targetX, targetY, selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: selected ? '#60a5fa' : '#3b82f6',
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: selected ? undefined : undefined,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <button
              onClick={() => deleteElements({ edges: [{ id }] })}
              className="flex items-center justify-center h-5 w-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg border border-red-400 transition-colors"
              title="Delete connection"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// ─── Node & edge type registries ──────────────────────────────────────────────

const nodeTypes = {
  InputNode,
  TrimNode,
  ScaleNode,
  FpsNode,
  EncodeNode,
  OutputNode: OutputNodeComponent,
  AudioNormalizeNode,
  CropNode,
  ColorAdjustNode,
  DenoiseNode,
}

const edgeTypes = {
  deletable: DeletableEdge,
}

// ─── Default graph ─────────────────────────────────────────────────────────────

const defaultNodes: FlowNode[] = [
  {
    id: '1', type: 'InputNode', position: { x: 60, y: 160 },
    data: { filename: 'Select from library' },
  },
  {
    id: '2', type: 'EncodeNode', position: { x: 340, y: 100 },
    data: { video_codec: 'h264_nvenc', video_bitrate: '8M', nvenc_preset: 'p5', audio_codec: 'aac', audio_bitrate: '192k', use_gpu: true },
  },
  {
    id: '3', type: 'OutputNode', position: { x: 640, y: 160 },
    data: { filename: 'output.mp4', container: 'mp4' },
  },
]

const defaultEdges: Edge[] = [
  { id: 'e1-2', type: 'deletable', source: '1', target: '2', animated: true },
  { id: 'e2-3', type: 'deletable', source: '2', target: '3', animated: true },
]

let nodeCounter = 10

const NODE_TEMPLATES = [
  { type: 'TrimNode',           label: 'Trim',           data: { start: 0, end: null } },
  { type: 'ScaleNode',          label: 'Scale',          data: { width: 1920, height: 1080, use_cuda: true } },
  { type: 'FpsNode',            label: 'FPS',            data: { fps: 30 } },
  { type: 'CropNode',           label: 'Crop',           data: { w: 1920, h: 1080, x: 0, y: 0 } },
  { type: 'ColorAdjustNode',    label: 'Color Adjust',   data: { brightness: 0, contrast: 0, saturation: 1, gamma: 1 } },
  { type: 'DenoiseNode',        label: 'Denoise',        data: { filter: 'hqdn3d', strength: 3 } },
  { type: 'AudioNormalizeNode', label: 'Normalize Audio',data: { target_i: -16, target_tp: -1.5 } },
] as const

// ─── Inner graph (needs ReactFlowProvider context) ────────────────────────────

function GraphInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [running, setRunning] = useState(false)
  const { fitView } = useReactFlow()

  const { mediaItems, selectedMediaId, activeProject, upsertJob, setSelectedJobId, setActivePanel } = useAppStore()
  const selectedMedia = mediaItems.find(m => m.id === selectedMediaId)

  const syncInputNode = useCallback(() => {
    if (!selectedMedia) return
    setNodes(ns => ns.map(n =>
      n.id === '1' ? { ...n, data: { ...n.data, filename: selectedMedia.filename } } : n
    ))
  }, [selectedMedia, setNodes])

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, type: 'deletable', animated: true }, eds))
  }, [setEdges])

  const addNode = useCallback((template: typeof NODE_TEMPLATES[number]) => {
    nodeCounter++
    const newNode: FlowNode = {
      id: String(nodeCounter),
      type: template.type,
      position: { x: 100 + Math.random() * 300, y: 80 + Math.random() * 180 },
      data: { ...template.data },
    }
    setNodes(ns => [...ns, newNode])
    setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50)
  }, [setNodes, fitView])

  const resetGraph = useCallback(() => {
    setNodes(defaultNodes)
    setEdges(defaultEdges)
    setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50)
  }, [setNodes, setEdges, fitView])

  const handleRunGraph = useCallback(async () => {
    if (!selectedMedia || !activeProject) return
    setRunning(true)
    const sorted = [...nodes].sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))
    const graphJson = sorted.map(n => ({ type: n.type, data: n.data }))
    try {
      const job = await createJob({
        project_id: activeProject.id,
        name: `Graph – ${selectedMedia.filename}`,
        input_media_ids: [selectedMedia.id],
        settings: {},
        node_graph: graphJson,
      })
      upsertJob(job)
      const started = await startJob(job.id)
      upsertJob(started)
      setSelectedJobId(job.id)
      setActivePanel('jobs')
    } catch (err) {
      console.error('Graph run failed:', err)
    } finally {
      setRunning(false)
    }
  }, [nodes, selectedMedia, activeProject, upsertJob, setSelectedJobId, setActivePanel])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-zinc-800 bg-zinc-950">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mr-1">Pipeline</span>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {NODE_TEMPLATES.map(t => (
          <Button key={t.type} variant="ghost" size="sm" onClick={() => addNode(t)} className="text-zinc-300">
            <Plus className="h-3 w-3" />
            {t.label}
          </Button>
        ))}

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        <Button variant="ghost" size="sm" onClick={resetGraph} title="Reset to default graph" className="text-zinc-500">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>

        <div className="flex-1" />

        <span className="text-[10px] text-zinc-600 hidden sm:block">
          Click edge to select → X to delete • Delete/Backspace removes selected nodes
        </span>

        {selectedMedia && (
          <Button variant="outline" size="sm" onClick={syncInputNode}>
            Sync: {selectedMedia.filename.length > 18 ? selectedMedia.filename.substring(0, 18) + '…' : selectedMedia.filename}
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunGraph}
          disabled={running || !selectedMedia || !activeProject}
        >
          <Play className="h-3 w-3" />
          {running ? 'Running…' : 'Run Graph'}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={['Delete', 'Backspace']}
          fitView
          style={{ background: 'hsl(222 18% 8%)' }}
          defaultEdgeOptions={{ type: 'deletable', animated: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(222 18% 22%)" />
          <Controls
            style={{ background: 'hsl(222 18% 14%)', border: '1px solid hsl(222 18% 22%)' }}
            className="[&_button]:!bg-zinc-900 [&_button]:!border-zinc-700 [&_button]:!text-zinc-300"
          />
          <MiniMap
            nodeColor={n => {
              const colors: Record<string, string> = {
                InputNode: '#3b82f6', OutputNode: '#10b981', EncodeNode: '#a855f7',
                TrimNode: '#f59e0b', ScaleNode: '#06b6d4', FpsNode: '#6366f1',
                CropNode: '#f43f5e', AudioNormalizeNode: '#14b8a6',
                ColorAdjustNode: '#f97316', DenoiseNode: '#ec4899',
              }
              return colors[n.type ?? ''] ?? '#52525b'
            }}
            style={{ background: 'hsl(222 18% 11%)', border: '1px solid hsl(222 18% 22%)' }}
          />
        </ReactFlow>
      </div>

      {/* Help bar */}
      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-800 bg-zinc-950">
        <HelpChip icon="⌨" text="Delete / Backspace — remove selected node" />
        <HelpChip icon="🔗" text="Drag handle → handle to connect" />
        <HelpChip icon="✕" text="Click edge, then X to disconnect" />
        <HelpChip icon="🖱" text="Scroll to zoom, drag to pan" />
      </div>
    </div>
  )
}

function HelpChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="text-[9px] text-zinc-600 flex items-center gap-1">
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  )
}

// ─── Public export — wrapped in provider ──────────────────────────────────────

export function NodeGraph() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  )
}
