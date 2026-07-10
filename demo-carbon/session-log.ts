// Session recorder — everything the salesman saw, decided and applied, per
// session, structured for study. localStorage only; leaves the browser solely
// via the inspector's explicit download button. The sim runner reads the same
// log through window.__sessionLog.

export interface SessionEvent {
  t: number
  route: string
  kind: string
  data: Record<string, unknown>
}

const KEY = 'nova:session-log'
const ID_KEY = 'nova:session-id'

export function sessionId(): string {
  let id = sessionStorage.getItem(ID_KEY)
  if (!id) {
    id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(ID_KEY, id)
  }
  return id
}

function read(): { id: string; events: SessionEvent[] } {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { id: string; events: SessionEvent[] } | null
    if (raw && raw.id === sessionId()) return raw
  } catch {
    /* fresh */
  }
  return { id: sessionId(), events: [] }
}

export function logEvent(kind: string, data: Record<string, unknown> = {}): void {
  const log = read()
  log.events.push({ t: Date.now(), route: location.pathname + location.search, kind, data })
  sessionStorage.setItem(KEY, JSON.stringify(log))
}

export function sessionLog(): { id: string; events: SessionEvent[] } {
  return read()
}

export function downloadSessionLog(): void {
  const log = read()
  const blob = new Blob([JSON.stringify(log, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${log.id}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
