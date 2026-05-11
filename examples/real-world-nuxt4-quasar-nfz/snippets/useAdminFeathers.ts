export function useAdminFeathers() {
  const { $api } = useNuxtApp()
  const auth = useNfzAuth()

  async function ensureAdmin(): Promise<void> {
    await auth.init()

    if (!auth.isAuthenticated.value) {
      throw new Error('Authentification requise')
    }

    if (!auth.isAdmin.value) {
      throw new Error('Accès admin requis')
    }
  }

  async function find<T>(serviceName: string, params?: Record<string, unknown>): Promise<T> {
    await ensureAdmin()
    return await $api.service(serviceName).find(params) as T
  }

  async function get<T>(serviceName: string, id: string): Promise<T> {
    await ensureAdmin()
    return await $api.service(serviceName).get(id) as T
  }

  async function create<T>(serviceName: string, data: Record<string, unknown>): Promise<T> {
    await ensureAdmin()
    return await $api.service(serviceName).create(data) as T
  }

  async function patch<T>(serviceName: string, id: string, data: Record<string, unknown>): Promise<T> {
    await ensureAdmin()
    return await $api.service(serviceName).patch(id, data) as T
  }

  async function remove<T>(serviceName: string, id: string): Promise<T> {
    await ensureAdmin()
    return await $api.service(serviceName).remove(id) as T
  }

  return {
    ensureAdmin,
    service: $api.service.bind($api),
    find,
    get,
    create,
    patch,
    remove
  }
}
