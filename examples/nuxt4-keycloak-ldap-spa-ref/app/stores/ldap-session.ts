import { defineStore } from 'pinia'
import type { KeycloakLdapAuthResult, LdapAppUser } from '~/types/ldap-user'

interface LdapSessionState {
  synchronized: boolean
  loading: boolean
  error: string | null
  accessToken: string | null
  currentUser: LdapAppUser | null
  lastAuthResult: KeycloakLdapAuthResult | null
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

export const useLdapSessionStore = defineStore('ldap-session', {
  state: (): LdapSessionState => ({
    synchronized: false,
    loading: false,
    error: null,
    accessToken: null,
    currentUser: null,
    lastAuthResult: null,
    updatedAt: null,
  }),

  getters: {
    isAuthenticated: state => Boolean(state.accessToken && state.currentUser),

    username: state => state.currentUser?.username ?? null,

    displayName: state =>
      state.currentUser?.displayName
      || state.currentUser?.username
      || state.currentUser?.email
      || 'Utilisateur',

    initials: (state) => {
      const name = state.currentUser?.displayName
        || state.currentUser?.username
        || 'U'

      return name
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('')
    },

    roles: state => state.currentUser?.roles ?? [],

    groups: state => state.currentUser?.groups ?? [],

    isAdmin: state => Boolean(state.currentUser?.isAdmin),

    isDsi: state => Boolean(state.currentUser?.isDsi),
  },

  actions: {
    startLoading(): void {
      this.loading = true
      this.error = null
    },

    setAuthResult(result: KeycloakLdapAuthResult): void {
      const token = result.accessToken || result.access_token || result.token || null

      this.accessToken = token
      this.currentUser = result.user ?? null
      this.lastAuthResult = result
      this.synchronized = Boolean(result.user)
      this.error = null
      this.loading = false
      this.updatedAt = new Date().toISOString()
    },

    setError(error: unknown): void {
      this.error = normalizeError(error)
      this.loading = false
      this.synchronized = false
    },

    clear(): void {
      this.synchronized = false
      this.loading = false
      this.error = null
      this.accessToken = null
      this.currentUser = null
      this.lastAuthResult = null
      this.updatedAt = null
    },
  },

  persist: {
    storage: piniaPluginPersistedstate.sessionStorage(),
    pick: [
      'synchronized',
      'accessToken',
      'currentUser',
      'lastAuthResult',
      'updatedAt',
    ],
  },
})
