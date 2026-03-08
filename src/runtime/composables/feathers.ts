import type { ClientApplication, ServiceTypes } from 'nuxt-feathers-zod/client'
import { useNuxtApp } from '#imports'

type ApiInjection = { $api: unknown; $client?: ClientApplication }

export function useFeathers() {
  const nuxtApp = useNuxtApp() as unknown as ApiInjection
  const api = nuxtApp.$api
  // Prefer the raw Feathers client when available (for direct service calls).
  const client = (nuxtApp.$client ?? (nuxtApp.$api as any)) as ClientApplication
  return { api, client }
}

export function useService<L extends keyof ServiceTypes>(path: L) {
  const { client } = useFeathers()
  return client.service<ServiceTypes[L]>(String(path))
}
