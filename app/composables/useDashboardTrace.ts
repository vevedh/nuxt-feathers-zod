import type { DashboardTraceLevel, DashboardTraceSource } from '~/stores/dashboardTrace'
import { useDashboardTraceStore } from '~/stores/dashboardTrace'

export function useDashboardTrace() {
  const store = useDashboardTraceStore()
  store.hydrate()

  function trace(source: DashboardTraceSource, event: string, message: string, meta?: Record<string, any>, level: DashboardTraceLevel = 'info') {
    store.push({ source, event, message, meta, level })
  }

  return {
    store,
    trace,
    info: (source: DashboardTraceSource, event: string, message: string, meta?: Record<string, any>) => trace(source, event, message, meta, 'info'),
    success: (source: DashboardTraceSource, event: string, message: string, meta?: Record<string, any>) => trace(source, event, message, meta, 'success'),
    warn: (source: DashboardTraceSource, event: string, message: string, meta?: Record<string, any>) => trace(source, event, message, meta, 'warn'),
    error: (source: DashboardTraceSource, event: string, message: string, meta?: Record<string, any>) => trace(source, event, message, meta, 'error')
  }
}
