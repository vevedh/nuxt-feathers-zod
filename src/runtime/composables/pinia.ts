type FeathersPiniaModule = Record<string, any>

export type CreatePiniaClient = (...args: any[]) => any
export type FeathersPiniaHelper = (...args: any[]) => any

export async function loadFeathersPinia(): Promise<FeathersPiniaModule> {
  return await import('feathers-pinia') as FeathersPiniaModule
}

export async function resolveCreatePiniaClient(): Promise<CreatePiniaClient> {
  const mod = await loadFeathersPinia()
  const factory = mod.createPiniaClient ?? mod.default?.createPiniaClient ?? mod.default

  if (typeof factory !== 'function') {
    throw new TypeError('[nuxt-feathers-zod] Unable to resolve feathers-pinia createPiniaClient factory.')
  }

  return factory as CreatePiniaClient
}

export async function resolveFeathersPiniaHelper(name: string): Promise<FeathersPiniaHelper> {
  const mod = await loadFeathersPinia()
  const helper = mod[name] ?? mod.default?.[name]

  if (typeof helper !== 'function') {
    throw new TypeError(`[nuxt-feathers-zod] Unable to resolve feathers-pinia helper: ${name}.`)
  }

  return helper as FeathersPiniaHelper
}
