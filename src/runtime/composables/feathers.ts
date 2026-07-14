import type { ClientApplication, ServiceTypes } from '../client'
import { useNuxtApp } from '#imports'

interface ApiInjection {
  $api: ClientApplication
  $client?: ClientApplication
  $piniaClient?: null
}

export function useFeathers() {
  const nuxtApp = useNuxtApp() as unknown as ApiInjection
  const client = (nuxtApp.$client ?? nuxtApp.$api) as ClientApplication
  const api = (nuxtApp.$api ?? client) as ClientApplication

  return {
    api,
    client,
    // Kept only to avoid breaking old destructuring code. NFZ no longer
    // creates a the legacy service-store wrapper client.
    piniaClient: null,
  }
}

export function useService<L extends keyof ServiceTypes>(path: L) {
  const { api } = useFeathers()
  return (api as any).service(String(path)) as ServiceTypes[L]
}

export function useRawService<L extends keyof ServiceTypes>(path: L) {
  const { client } = useFeathers()
  return (client as any).service(String(path)) as ServiceTypes[L]
}
