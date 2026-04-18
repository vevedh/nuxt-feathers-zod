import type { ClientApplication, ServiceTypes } from '../client'
import { useNuxtApp } from '#imports'

interface ApiInjection {
  $api: unknown
  $client?: ClientApplication
  $piniaClient?: unknown
}

export function useFeathers() {
  const nuxtApp = useNuxtApp() as unknown as ApiInjection
  const api = nuxtApp.$api
  const client = (nuxtApp.$client ?? nuxtApp.$api) as ClientApplication
  const piniaClient = (nuxtApp.$piniaClient ?? (api !== client ? api : null)) as any
  return { api, client, piniaClient }
}

export function useService<L extends keyof ServiceTypes>(path: L) {
  const { piniaClient, client } = useFeathers()
  const host = (piniaClient && typeof piniaClient.service === 'function') ? piniaClient : client
  return (host as any).service<ServiceTypes[L]>(String(path))
}

export function useRawService<L extends keyof ServiceTypes>(path: L) {
  const { client } = useFeathers()
  return client.service<ServiceTypes[L]>(String(path))
}
