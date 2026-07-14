import { defineStore } from 'pinia'

export interface KeycloakTokenParsed {
  sub?: string
  preferred_username?: string
  email?: string
  name?: string
  given_name?: string
  family_name?: string
  realm_access?: {
    roles?: string[]
  }
  resource_access?: Record<string, { roles?: string[] }>
  [key: string]: unknown
}

interface SsoSessionState {
  ready: boolean
  authenticated: boolean
  token: string | null
  tokenParsed: KeycloakTokenParsed | null
  error: string | null
  updatedAt: string | null
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  }
  catch {
    return String(error)
  }
}

export const useSsoSessionStore = defineStore('sso-session', {
  state: (): SsoSessionState => ({
    ready: false,
    authenticated: false,
    token: null,
    tokenParsed: null,
    error: null,
    updatedAt: null,
  }),

  getters: {
    username: state => state.tokenParsed?.preferred_username ?? null,

    displayName: state =>
      state.tokenParsed?.name
      || state.tokenParsed?.preferred_username
      || state.tokenParsed?.email
      || 'Utilisateur SSO',

    email: state => state.tokenParsed?.email ?? null,
  },

  actions: {
    setSession(payload: {
      token?: string | null
      tokenParsed?: KeycloakTokenParsed | null
      authenticated?: boolean
    }): void {
      this.ready = true
      this.authenticated = payload.authenticated === true
      this.token = payload.token ?? null
      this.tokenParsed = payload.tokenParsed ?? null
      this.error = null
      this.updatedAt = new Date().toISOString()
    },

    setAnonymous(): void {
      this.ready = true
      this.authenticated = false
      this.token = null
      this.tokenParsed = null
      this.error = null
      this.updatedAt = new Date().toISOString()
    },

    setError(error: unknown): void {
      this.ready = true
      this.authenticated = false
      this.token = null
      this.error = normalizeError(error)
      this.updatedAt = new Date().toISOString()
    },

    clear(): void {
      this.ready = false
      this.authenticated = false
      this.token = null
      this.tokenParsed = null
      this.error = null
      this.updatedAt = null
    },
  },
})
