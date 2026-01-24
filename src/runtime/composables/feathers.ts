import type { ServiceTypes } from 'nuxt-feathers-zod/client'
import { useNuxtApp } from '#imports'

export function useFeathers() {
  const { $api: api } = useNuxtApp()
  return { api }
}

export function useService<L extends keyof ServiceTypes>(path: L) {
  const { api } = useFeathers()
  return api.service<L>(path)
}
