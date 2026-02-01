import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { RestService } from '@feathersjs/rest-client'
import { joinURL } from 'ufo'

import type { ActionRunData, ActionRunResult } from './actions.schema'

export const actionsPath = 'actions'

// IMPORTANT: only list methods that actually exist at registration time
export const actionsMethods = ['find', 'run'] as const

export type ActionsClientService = RestService & {
  run(data: ActionRunData, params?: Params): Promise<ActionRunResult>
}

function getRestConfig() {
  // Nuxt auto-import (works in Nuxt runtime bundles)
  const cfg = useRuntimeConfig()

  const publicCfg: any = (cfg as any).public || {}
  const feathersCfg: any = publicCfg.feathers || {}

  const restPrefix =
    feathersCfg?.rest?.path ??
    feathersCfg?.restPath ??
    feathersCfg?.prefix ??
    '/feathers'

  const restUrl =
    feathersCfg?.restUrl ??
    feathersCfg?.baseURL ??
    feathersCfg?.url ??
    '' // empty => same origin (browser)

  return { restPrefix, restUrl }
}

async function getAuthHeader(client: ClientApplication, params?: Params) {
  const p: any = params || {}
  const headers: any = p.headers || {}

  const auth =
    headers.authorization ||
    headers.Authorization ||
    undefined

  if (auth)
    return String(auth)

  // Best-effort: if Feathers auth is configured, attach Bearer token for fallback HTTP
  const authn: any = (client as any).authentication
  if (authn && typeof authn.getAccessToken === 'function') {
    try {
      const token = await authn.getAccessToken()
      if (token)
        return `Bearer ${token}`
    }
    catch {
      // ignore
    }
  }

  return undefined
}

/**
 * Ensure the custom method exists BEFORE registering the service with `methods: ['...']`.
 * This avoids Feathers hook system crashing with: "Can not apply hooks. 'run' is not a function".
 *
 * Strategy (transport-agnostic):
 * 1) if remote.run exists -> keep (socket or already patched)
 * 2) else if remote.request exists -> REST transport custom method
 * 3) else if remote.send exists -> socket low-level
 * 4) else -> fallback HTTP POST {restPrefix}/{service}/run (same origin by default)
 */
function ensureRunMethod(client: ClientApplication, remote: any) {
  if (typeof remote?.run === 'function')
    return

  // REST transport (feathers rest-client)
  if (typeof remote?.request === 'function') {
    remote.run = (data: ActionRunData, params?: Params) =>
      remote.request({ method: 'run', body: data }, params)
    return
  }

  // Socket transport (best-effort)
  if (typeof remote?.send === 'function') {
    remote.run = (data: ActionRunData, params?: Params) =>
      remote.send('run', data, params)
    return
  }

  // Universal HTTP fallback
  remote.run = async (data: ActionRunData, params?: Params) => {
    const { restPrefix, restUrl } = getRestConfig()
    const url = joinURL(restUrl, restPrefix, actionsPath, 'run')

    const auth = await getAuthHeader(client, params)
    const headers: Record<string, string> = {}
    if (auth)
      headers.authorization = auth

    return await $fetch<ActionRunResult>(url, {
      method: 'POST',
      body: data,
      headers,
    })
  }
}

export function actionsClient(client: ClientApplication) {
  const connection: any = client.get('connection')
  const remote: any = connection.service(actionsPath)

  // SSR-safe: never register custom methods on server-side rendering
  if (import.meta.server) {
    client.use(actionsPath, remote, { methods: ['find'] })
    return
  }

  // Browser: ensure run exists BEFORE registering methods
  ensureRunMethod(client, remote)

  client.use(actionsPath, remote, {
    methods: actionsMethods as unknown as string[],
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [actionsPath]: ActionsClientService
  }
}
