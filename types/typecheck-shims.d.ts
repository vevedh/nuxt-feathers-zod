/**
 * Typecheck shims for module-repo `tsc` runs.
 * In real Nuxt runtime, these are provided by Nuxt virtual modules / auto-imports.
 */

/** Nuxt virtual modules */
declare module '#app' {
  export * from 'nuxt/app'
}
declare module '#imports' {
  export * from 'nuxt/app'
  export * from 'nuxt/composables'
}

/** Nuxt auto-imported composables (used in shared service files) */
declare function useRuntimeConfig<T = any>(): T
declare function useNuxtApp<T = any>(): T

/**
 * Self-package entrypoints used by generated services.
 * During module dev/typecheck, we only need minimal types for augmentation.
 */
declare module 'nuxt-feathers-zod/server' {
  import type { Application as FeathersApp, HookContext as FeathersHookContext, Params } from '@feathersjs/feathers'
  export type Application = FeathersApp
  export type HookContext = FeathersHookContext
  export type { Params }
  // Augmented per-service by generated code
  export interface ServiceTypes {}
}

declare module 'nuxt-feathers-zod/client' {
  import type { Application as FeathersApp } from '@feathersjs/feathers'
  export type ClientApplication = FeathersApp
  // Augmented per-service by generated code
  export interface ServiceTypes {}
}
