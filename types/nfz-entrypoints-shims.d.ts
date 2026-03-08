// `tsc` in the module repository cannot resolve the generated virtual entrypoints
// (they exist after Nuxt template generation/build). Provide minimal type stubs.

declare module 'nuxt-feathers-zod/server' {
  export type Application = any
  // Feathers HookContext is generic in the generated service templates.
  // We keep it permissive here for repo-level `tsc`.
  export type HookContext<S = any> = any
  // This interface is augmented by generated `*.ts` service files.
  export interface ServiceTypes {}
}

declare module 'nuxt-feathers-zod/client' {
  export interface ClientApplication {
    // The Feathers app supports a simple key/value store.
    get<T = any>(key: string): T
    set?(key: string, value: any): this

    // Keep generic so repo-level `tsc` accepts type arguments.
    service<T = any>(path: string): T

    // Client-side service registration used by the generated `*.shared.ts` files.
    use(path: string, service: any, options?: { methods?: string[]; [k: string]: any }): this
  }

  // In apps, this is augmented by generated `*.shared.ts` files.
  export interface ServiceTypes {}
}
