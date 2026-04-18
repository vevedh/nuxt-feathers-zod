export default defineNuxtPlugin((nuxtApp) => {
  const { info, success, error } = useDashboardTrace()
  const route = useRoute()

  info('app', 'app:init:start', 'Initialisation du dashboard', {
    path: route.fullPath,
    mode: nuxtApp.$config?.public?.authProvider || 'local'
  })

  nuxtApp.hook('app:mounted', () => {
    success('app', 'app:init:ready', 'Dashboard monté côté client', { path: route.fullPath })
  })

  const api: any = nuxtApp.$api
  if (api && !(api as any).__nfzTraceWrapped) {
    const originalService = api.service.bind(api)
    api.service = (path: string) => {
      const svc = originalService(path)
      if (!svc || svc.__nfzTraceWrapped)
        return svc
      const methods = ['find', 'get', 'create', 'update', 'patch', 'remove']
      for (const method of methods) {
        if (typeof svc[method] !== 'function') continue
        const original = svc[method].bind(svc)
        svc[method] = async (...args: any[]) => {
          const startedAt = performance.now()
          info('service', 'service:request', `${path}.${method}()`, {
            path,
            method,
            args: method === 'find' ? args[0] : undefined
          })
          try {
            const result = await original(...args)
            success('service', 'service:success', `${path}.${method}() terminé`, {
              path,
              method,
              durationMs: Math.round(performance.now() - startedAt)
            })
            return result
          }
          catch (e: any) {
            error('service', 'service:error', `${path}.${method}() a échoué`, {
              path,
              method,
              durationMs: Math.round(performance.now() - startedAt),
              error: e?.message || String(e)
            })
            throw e
          }
        }
      }
      svc.__nfzTraceWrapped = true
      return svc
    }

    const wrapApiMethod = (name: string, source: 'auth' | 'service' = 'auth') => {
      if (typeof api[name] !== 'function') return
      const original = api[name].bind(api)
      api[name] = async (...args: any[]) => {
        info(source, `${name}:start`, `${name}() démarré`, { args: name === 'authenticate' ? { strategy: args?.[0]?.strategy } : undefined })
        try {
          const result = await original(...args)
          success(source, `${name}:success`, `${name}() réussi`)
          return result
        }
        catch (e: any) {
          error(source, `${name}:error`, `${name}() a échoué`, { error: e?.message || String(e) })
          throw e
        }
      }
    }

    wrapApiMethod('authenticate')
    wrapApiMethod('logout')
    wrapApiMethod('reAuthenticate')
    ;(api as any).__nfzTraceWrapped = true
  }
})
