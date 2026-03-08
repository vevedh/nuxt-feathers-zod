import { getPublicClientMode, getPublicRemoteAuthConfig, hasPublicKeycloakConfig } from 'nuxt-feathers-zod/config-utils'
export type PlaygroundScenarioId =
  | 'embedded-local'
  | 'embedded-keycloak'
  | 'embedded-auth-keycloak'
  | 'remote-rest-only'
  | 'remote-socketio-jwt'
  | 'remote-socketio-keycloak'
  | 'custom'

export function usePlaygroundScenario() {
  const config = useRuntimeConfig()
  const publicClient = computed(() => ((config.public as any)?._feathers?.client) ?? {})
  const auth = useAuth()

  const scenarioId = computed<PlaygroundScenarioId>(() => {
    const client = publicClient.value || {}
    const mode = getPublicClientMode(config.public as any)
    const remote = client?.remote || {}
    const transport = remote?.transport || 'auto'
    const payloadMode = getPublicRemoteAuthConfig(config.public as any)?.payloadMode || 'jwt'
    const keycloakEnabled = hasPublicKeycloakConfig(config.public as any)

    if (mode !== 'remote') {
      if (keycloakEnabled || auth.provider.value === 'keycloak') return 'embedded-auth-keycloak'
      return 'embedded-local'
    }
    if (transport === 'rest') return 'remote-rest-only'
    if (payloadMode === 'keycloak' || auth.provider.value === 'keycloak') return 'remote-socketio-keycloak'
    if (transport === 'socketio' || transport === 'auto') return 'remote-socketio-jwt'
    return 'custom'
  })

  const title = computed(() => {
    switch (scenarioId.value) {
      case 'embedded-local': return 'embedded + auth local'
      case 'embedded-keycloak': return 'embedded + Keycloak'
      case 'embedded-auth-keycloak': return 'embedded + auth + Keycloak'
      case 'remote-rest-only': return 'remote + REST seul'
      case 'remote-socketio-jwt': return 'remote + Socket.IO + JWT stocké'
      case 'remote-socketio-keycloak': return 'remote + Socket.IO + Keycloak'
      default: return 'scénario personnalisé'
    }
  })

  return {
    publicClient,
    scenarioId,
    title,
  }
}
