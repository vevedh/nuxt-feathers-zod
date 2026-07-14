import type Keycloak from 'keycloak-js'

declare module '#app' {
  interface NuxtApp {
    $keycloak?: {
      instance: Keycloak
      authenticated: boolean
      userid?: string
      token(): string | undefined
      login(opts?: any): Promise<void>
      logout(opts?: any): Promise<void>
      updateToken(minValidity?: number): Promise<boolean>
    }
  }
}

export {}
