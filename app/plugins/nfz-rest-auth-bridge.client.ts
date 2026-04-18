export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server)
    return

  const runtimeConfig = useRuntimeConfig() as any
  const publicConfig = runtimeConfig?.public || {}
  const socketEnabled = publicConfig?.enableSocketIO === true || publicConfig?.enableSocketIO === 'true'
  if (socketEnabled)
    return

  const authProvider = String(publicConfig?.authProvider || publicConfig?._feathers?.authProvider || 'local')
  if (authProvider !== 'local')
    return

  const runtime = useAuthRuntime()
  const restPath = String(publicConfig?._feathers?.transports?.rest?.path || '/feathers').replace(/\/+$/, '') || '/feathers'
  const authEndpoint = `${restPath}/authentication`

  function readPersistedToken() {
    const storageKey = String(publicConfig?._feathers?.auth?.client?.storageKey || publicConfig?._feathers?.client?.remote?.auth?.storageKey || 'feathers-jwt')
    try {
      return runtime.accessToken.value
        || localStorage.getItem(storageKey)
        || localStorage.getItem('feathers-jwt')
        || localStorage.getItem('accessToken')
        || null
    }
    catch {
      return runtime.accessToken.value || null
    }
  }

  async function restAuthenticate(payload: any) {
    return await $fetch(authEndpoint, {
      method: 'POST',
      body: payload,
    })
  }

  async function restReAuthenticate() {
    const token = readPersistedToken()
    if (!token)
      throw new Error('No access token available for REST reAuthenticate')

    return await $fetch(authEndpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        strategy: 'jwt',
        accessToken: token,
      },
    })
  }

  async function restLogout() {
    const token = readPersistedToken()
    return await $fetch(authEndpoint, {
      method: 'DELETE',
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    })
  }

  function patchClient(client: any) {
    if (!client || client.__nfzRestStrictPatched)
      return

    const socket = typeof client.get === 'function' ? client.get('socket') : (client.socket || client.io)
    try {
      if (socket && typeof socket.disconnect === 'function')
        socket.disconnect()
      if (client.io && typeof client.io.disconnect === 'function')
        client.io.disconnect()
    }
    catch {}

    try {
      if (typeof client.set === 'function') {
        client.set('socket', null)
        client.set('transport', 'rest')
      }
    }
    catch {}

    if (typeof client.authenticate === 'function')
      client.authenticate = restAuthenticate
    if (typeof client.reAuthenticate === 'function')
      client.reAuthenticate = restReAuthenticate
    if (typeof client.logout === 'function')
      client.logout = restLogout

    client.__nfzRestStrictPatched = true
  }

  patchClient((nuxtApp as any).$api)
  patchClient((nuxtApp as any).$client)
  patchClient((nuxtApp as any).$feathersClient)
})
