import { defineStore } from 'pinia'

<<<<<<< HEAD
interface LoginCredentials {
=======
type LoginCredentials = {
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  email: string
  password: string
}

<<<<<<< HEAD
interface AuthUser {
=======
type AuthUser = {
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  _id?: string
  email: string
  displayName?: string
  roles?: string[]
  groups?: string[]
  isAdmin?: boolean
}

<<<<<<< HEAD
interface AuthResult {
=======
type AuthResult = {
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  accessToken: string
  user?: AuthUser
}

export const useStudioSessionStore = defineStore('studioSession', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const isAdmin = computed(() => Boolean(user.value?.isAdmin || user.value?.roles?.includes('admin') || user.value?.groups?.includes('ADMIN')))

  function setSession(result: AuthResult): void {
    accessToken.value = result.accessToken
    user.value = result.user ?? null

    if (import.meta.client) {
      localStorage.setItem('nfz:accessToken', result.accessToken)
    }
  }

  function clearSession(): void {
    accessToken.value = null
    user.value = null

    if (import.meta.client) {
      localStorage.removeItem('nfz:accessToken')
    }
  }

  return {
    accessToken,
    user,
    ready,
    isAuthenticated,
    isAdmin,
    setSession,
<<<<<<< HEAD
    clearSession,
=======
    clearSession
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  }
})

export function useNfzAuth() {
  const session = useStudioSessionStore()
  const { $api } = useNuxtApp()

  async function init(): Promise<void> {
    if (session.ready) {
      return
    }

    if (import.meta.client) {
      const token = localStorage.getItem('nfz:accessToken')
      if (token) {
        session.accessToken = token
        await reAuthenticate().catch(() => session.clearSession())
      }
    }

    session.ready = true
  }

  async function login(credentials: LoginCredentials): Promise<AuthResult> {
    const result = await $api.authenticate({
      strategy: 'local',
      email: credentials.email,
<<<<<<< HEAD
      password: credentials.password,
=======
      password: credentials.password
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
    }) as AuthResult

    session.setSession(result)
    return result
  }

  async function reAuthenticate(): Promise<AuthResult> {
    const result = await $api.reAuthenticate() as AuthResult
    session.setSession(result)
    return result
  }

  async function logout(): Promise<void> {
    await $api.logout().catch(() => undefined)
    session.clearSession()
  }

  return {
    session,
    init,
    login,
    logout,
    reAuthenticate,
    isAuthenticated: session.isAuthenticated,
    isAdmin: session.isAdmin,
<<<<<<< HEAD
    user: session.user,
=======
    user: session.user
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
  }
}
