import { EditorLayout }  from '@/routes/EditorLayout'
import { DetachedPanel } from '@/routes/DetachedPanel'

export default function App() {
  const panelId = new URLSearchParams(window.location.search).get('panel')
  if (panelId) return <DetachedPanel panelId={panelId} />
  return <EditorLayout />
}
