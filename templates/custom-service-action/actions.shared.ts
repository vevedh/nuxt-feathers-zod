import { useRuntimeConfig } from '#imports'
import type { Params } from '@feathersjs/feathers'
import type { RestService } from '@feathersjs/rest-client'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import { joinURL } from 'ufo'

import type { ActionRunData, ActionRunResult } from './actions.schema'

export const actionsPath = 'actions'

// IMPORTANT: only list methods that actually exist at registration time
export const actionsMethods = ['find', 'run'] as const

export type ActionsClientService = RestService & {
  run(data: ActionRunData, params?: Params): Promise<ActionRunResult>
}

function getRestConfig() {
  const cfg = useRuntimeConfig() as Record<string, any>
  const publicCfg = cfg.public ?? {}
  const feathersCfg = publicCfg._feathers ?? {}

  const restPrefix =
    feathersCfg?.rest?.path
    ?? feathersCfg?.restPath
    ?? feathersCfg?.prefix
    ?? '/feathers'

  const restUrl =
    feathersCfg?.restUrl
    ?? feathersCfg?.baseURL
    ?? feathersCfg?.url
    ?? ''

  return { restPrefix, restUrl }
}

async function getAuthHeader(client: ClientApplication, params?: Params) {
  const p = params ?? {}
  const headers = (p as any).headers ?? {}
  const auth = headers.authorization ?? headers.Authorization

  if (auth) {
    return String(auth)
  }

  const authn = (client as any).authentication
  if (authn && typeof authn.getAccessToken === 'function') {
    try {
      const token = await authn.getAccessToken()
      if (token) {
        return `Bearer ${token}`
      }
    }
    catch {
      // ignore
    }
  }

  return undefined
}

function ensureRunMethod(client: ClientApplication, remote: any) {
  if (typeof remote?.run === 'function') {
    return
  }

  if (typeof remote?.request === 'function') {
    remote.run = (data: ActionRunData, params?: Params) =>
      remote.request({ method: 'run', body: data }, params)
    return
  }

  if (typeof remote?.send === 'function') {
    remote.run = (data: ActionRunData, params?: Params) =>
      remote.send('run', data, params)
    return
  }

  remote.run = async (data: ActionRunData, params?: Params) => {
    const { restPrefix, restUrl } = getRestConfig()
    const url = joinURL(restUrl, restPrefix, actionsPath, 'run')

    const auth = await getAuthHeader(client, params)
    const headers: Record<string, string> = {}
    if (auth) {
      headers.authorization = auth
    }

    return $fetch<ActionRunResult>(url, {
      method: 'POST',
      body: data,
      headers,
    })
  }
}

export function actionsClient(client: ClientApplication) {
  const connection: any = client.get('connection')
  const remote: any = connection.service(actionsPath)

  if (import.meta.server) {
    client.use(actionsPath, remote, { methods: ['find'] })
    return
  }

  ensureRunMethod(client, remote)

  client.use(actionsPath, remote, {
    methods: [...actionsMethods],
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [actionsPath]: ActionsClientService
  }
}
