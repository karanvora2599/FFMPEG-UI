import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PanelId = 'media' | 'preview' | 'inspector' | 'jobs' | 'nodes' | 'timeline'
export type PanelMode = 'docked' | 'floating' | 'detached' | 'hidden'
export type WorkspaceId = 'edit' | 'pipeline' | 'export' | 'preview'

export interface FloatingState {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
}

export interface PanelConfig {
  id: PanelId
  label: string
  mode: PanelMode
  floating: FloatingState
}

const DEFAULT_FLOATING: FloatingState = {
  x: 120, y: 80, width: 480, height: 400, zIndex: 100, minimized: false,
}

const PANEL_DEFAULTS: Record<PanelId, Omit<PanelConfig, 'mode' | 'floating'>> = {
  media:     { id: 'media',     label: 'Media Library' },
  preview:   { id: 'preview',   label: 'Preview Monitor' },
  inspector: { id: 'inspector', label: 'Inspector' },
  jobs:      { id: 'jobs',      label: 'Jobs & Logs' },
  nodes:     { id: 'nodes',     label: 'Node Pipeline' },
  timeline:  { id: 'timeline',  label: 'Timeline' },
}

function makeDefault(id: PanelId): PanelConfig {
  return {
    ...PANEL_DEFAULTS[id],
    mode: 'docked',
    floating: { ...DEFAULT_FLOATING },
  }
}

// Layout presets: which panels are docked and where the bottom tab goes
export type WorkspaceLayout = {
  id: WorkspaceId
  label: string
  description: string
  panels: Record<PanelId, PanelMode>
  bottomTab: 'jobs' | 'nodes' | 'timeline'
}

export const WORKSPACE_LAYOUTS: WorkspaceLayout[] = [
  {
    id: 'edit',
    label: 'Edit',
    description: 'All panels docked — standard editing layout',
    bottomTab: 'jobs',
    panels: {
      media: 'docked', preview: 'docked', inspector: 'docked',
      jobs: 'docked', nodes: 'hidden', timeline: 'hidden',
    },
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    description: 'Node graph front-and-centre',
    bottomTab: 'nodes',
    panels: {
      media: 'docked', preview: 'hidden', inspector: 'docked',
      jobs: 'hidden', nodes: 'docked', timeline: 'hidden',
    },
  },
  {
    id: 'export',
    label: 'Export',
    description: 'Inspector + Jobs side by side, no preview',
    bottomTab: 'jobs',
    panels: {
      media: 'docked', preview: 'hidden', inspector: 'docked',
      jobs: 'docked', nodes: 'hidden', timeline: 'hidden',
    },
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Large preview with timeline below',
    bottomTab: 'timeline',
    panels: {
      media: 'docked', preview: 'docked', inspector: 'hidden',
      jobs: 'hidden', nodes: 'hidden', timeline: 'docked',
    },
  },
]

let _maxZ = 100

interface PanelStoreState {
  panels: Record<PanelId, PanelConfig>
  activeWorkspace: WorkspaceId
  bottomTab: 'jobs' | 'nodes' | 'timeline'

  setMode: (id: PanelId, mode: PanelMode) => void
  floatPanel: (id: PanelId) => void
  dockPanel: (id: PanelId) => void
  hidePanel: (id: PanelId) => void
  detachPanel: (id: PanelId) => void
  togglePanel: (id: PanelId) => void

  updateFloating: (id: PanelId, patch: Partial<FloatingState>) => void
  bringToFront: (id: PanelId) => void
  toggleMinimize: (id: PanelId) => void

  applyWorkspace: (id: WorkspaceId) => void
  setBottomTab: (tab: 'jobs' | 'nodes' | 'timeline') => void
}

export const usePanelStore = create<PanelStoreState>()(
  persist(
    (set, get) => ({
      panels: {
        media:     makeDefault('media'),
        preview:   makeDefault('preview'),
        inspector: makeDefault('inspector'),
        jobs:      makeDefault('jobs'),
        nodes:     makeDefault('nodes'),
        timeline:  makeDefault('timeline'),
      },
      activeWorkspace: 'edit',
      bottomTab: 'jobs',

      setMode: (id, mode) =>
        set(s => ({
          panels: { ...s.panels, [id]: { ...s.panels[id], mode } },
        })),

      floatPanel: (id) => {
        _maxZ++
        set(s => ({
          panels: {
            ...s.panels,
            [id]: {
              ...s.panels[id],
              mode: 'floating',
              floating: { ...s.panels[id].floating, zIndex: _maxZ, minimized: false },
            },
          },
        }))
      },

      dockPanel: (id) =>
        set(s => ({
          panels: { ...s.panels, [id]: { ...s.panels[id], mode: 'docked' } },
        })),

      hidePanel: (id) =>
        set(s => ({
          panels: { ...s.panels, [id]: { ...s.panels[id], mode: 'hidden' } },
        })),

      detachPanel: (id) => {
        const label = PANEL_DEFAULTS[id].label
        const w = window.open(
          `${location.origin}/?panel=${id}`,
          `gmf-panel-${id}`,
          'width=900,height=650,menubar=no,toolbar=no,location=no,status=no',
        )
        if (w) {
          set(s => ({
            panels: { ...s.panels, [id]: { ...s.panels[id], mode: 'detached' } },
          }))
          // Re-dock when that window closes
          const poll = setInterval(() => {
            if (w.closed) {
              clearInterval(poll)
              get().dockPanel(id)
            }
          }, 1000)
        }
      },

      togglePanel: (id) => {
        const { mode } = get().panels[id]
        if (mode === 'hidden') get().dockPanel(id)
        else get().hidePanel(id)
      },

      updateFloating: (id, patch) =>
        set(s => ({
          panels: {
            ...s.panels,
            [id]: {
              ...s.panels[id],
              floating: { ...s.panels[id].floating, ...patch },
            },
          },
        })),

      bringToFront: (id) => {
        _maxZ++
        set(s => ({
          panels: {
            ...s.panels,
            [id]: {
              ...s.panels[id],
              floating: { ...s.panels[id].floating, zIndex: _maxZ },
            },
          },
        }))
      },

      toggleMinimize: (id) =>
        set(s => ({
          panels: {
            ...s.panels,
            [id]: {
              ...s.panels[id],
              floating: {
                ...s.panels[id].floating,
                minimized: !s.panels[id].floating.minimized,
              },
            },
          },
        })),

      applyWorkspace: (id) => {
        const layout = WORKSPACE_LAYOUTS.find(l => l.id === id)
        if (!layout) return
        set(s => {
          const panels = { ...s.panels }
          for (const [pid, mode] of Object.entries(layout.panels)) {
            panels[pid as PanelId] = { ...panels[pid as PanelId], mode: mode as PanelMode }
          }
          return { panels, activeWorkspace: id, bottomTab: layout.bottomTab }
        })
      },

      setBottomTab: (tab) => set({ bottomTab: tab }),
    }),
    {
      name: 'gmf-panel-state',
      partialize: (s) => ({
        panels: s.panels,
        activeWorkspace: s.activeWorkspace,
        bottomTab: s.bottomTab,
      }),
    }
  )
)
