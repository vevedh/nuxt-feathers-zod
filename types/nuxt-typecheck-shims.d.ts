// These shims exist ONLY to make `bun run typecheck` (tsc -p tsconfig.typecheck.json)
// work inside the module repo. They do not affect the generated runtime templates.

declare module '#app' {
  export function defineNuxtPlugin<T = any>(plugin: T): T
  export function useNuxtApp(): any
  export function useRuntimeConfig(): any
}

declare module '#imports' {
  export function useNuxtApp(): any
  export function useRuntimeConfig(): any
}

declare module 'nuxt/config' {
  export function defineNuxtConfig(config: any): any
}

// Fallback globals (some generated/shared code may reference the auto-import names directly).
declare function defineNuxtConfig(config: any): any
declare function defineNuxtPlugin<T = any>(plugin: T): T
declare function useNuxtApp(): any
declare function useRuntimeConfig(): any
