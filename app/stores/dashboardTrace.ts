import { defineStore } from 'pinia'

export type DashboardTraceLevel = 'info' | 'success' | 'warn' | 'error'
export type DashboardTraceSource = 'app' | 'auth' | 'route' | 'service' | 'mongo' | 'server' | 'ui'

export type DashboardTraceEvent = {
  id: string
  ts: string
  level: DashboardTraceLevel
  source: DashboardTraceSource
  event: string
  message: string
  meta?: Record<string, any>
}

const STORAGE_KEY = 'nfz-dashboard-traces'
const MAX_TRACES = 250

function normalizeTrace(input: Partial<DashboardTraceEvent> & Pick<DashboardTraceEvent, 'event' | 'message'>): DashboardTraceEvent {
  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: input.ts || new Date().toISOString(),
    level: input.level || 'info',
    source: input.source || 'ui',
    event: input.event,
    message: input.message,
    meta: input.meta || {}
  }
}

export const useDashboardTraceStore = defineStore('dashboard-trace', {
  state: () => ({
    items: [] as DashboardTraceEvent[],
    hydrated: false,
  }),
  getters: {
    latest: state => state.items[0] || null,
    groupedBySource: state => {
      return state.items.reduce((acc, item) => {
        ;(acc[item.source] ||= []).push(item)
        return acc
      }, {} as Record<string, DashboardTraceEvent[]>)
    }
  },
  actions: {
    hydrate() {
      if (this.hydrated || !import.meta.client) return
      this.hydrated = true
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.items = parsed.slice(0, MAX_TRACES)
        }
      }
      catch {}
    },
    persist() {
      if (!import.meta.client) return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items.slice(0, MAX_TRACES)))
      }
      catch {}
    },
    push(trace: Partial<DashboardTraceEvent> & Pick<DashboardTraceEvent, 'event' | 'message'>) {
      this.hydrate()
      const normalized = normalizeTrace(trace)
      this.items.unshift(normalized)
      if (this.items.length > MAX_TRACES)
        this.items = this.items.slice(0, MAX_TRACES)
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    }
  }
})
