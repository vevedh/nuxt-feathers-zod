import type { RouteLocationNormalizedLoaded } from 'vue-router'

declare module '#app' {
  interface PageMeta {
    public?: boolean
    roles?: string[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    roles?: string[]
  }
}

export type TypedRoute = RouteLocationNormalizedLoaded
