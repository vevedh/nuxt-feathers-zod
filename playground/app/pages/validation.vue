<script setup lang="ts">
const auth = useAuth()
onMounted(() => { auth.init().catch(() => {}) })
const { publicClient, scenarioId, title } = usePlaygroundScenario()

const scenarios = computed(() => [
  {
    id: 'embedded-local',
    title: 'embedded + auth local inchangé',
    env: `NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false`,
    checks: [
      'Page / charge sans erreur',
      'Login local sur / fonctionne',
      'reAuthenticate() fonctionne sur /tests',
      'Service embedded (messages/users/mongos) répond',
    ],
  },
  {
    id: 'embedded-auth-keycloak',
    title: 'embedded + auth + Keycloak',
    env: `NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=true
KC_URL=https://sso.example.com
KC_REALM=myrealm
KC_CLIENT_ID=myclient`,
    checks: [
      'Le provider détecté est keycloak',
      'Le bridge Keycloak embedded avec auth actif fonctionne',
      'whoami()/updateToken()/logout() sont disponibles sur /tests',
      'Les services embedded restent joignables après login SSO',
    ],
  },
  {
    id: 'remote-rest-only',
    title: 'remote + REST seul',
    env: `NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=rest
NFZ_REMOTE_URL=http://localhost:3030
NFZ_REMOTE_REST_PATH=/feathers
NFZ_KEYCLOAK_ENABLED=false`,
    checks: [
      'Test connection sur /tests via find($limit=1)',
      'Pas de dépendance Socket.IO requise',
      'authenticate(payload) ou reAuthenticate() fonctionne',
      'messages/users/ldapusers sont joignables côté REST',
    ],
  },
  {
    id: 'remote-socketio-jwt',
    title: 'remote + Socket.IO + JWT stocké',
    env: `NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=socketio
NFZ_REMOTE_URL=http://localhost:3030
NFZ_REMOTE_REST_PATH=/feathers
NFZ_REMOTE_WS_PATH=/socket.io
NFZ_REMOTE_AUTH_PAYLOAD_MODE=jwt
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=accessToken
NFZ_REMOTE_AUTH_STORAGE_KEY=feathers-jwt
NFZ_KEYCLOAK_ENABLED=false`,
    checks: [
      'Un JWT présent en storage déclenche authenticate(payload) au boot',
      'reAuthenticate() reste disponible',
      'Reconnect Socket.IO relance l’auth',
      'Le service ping répond après reconnexion',
    ],
  },
  {
    id: 'remote-socketio-keycloak',
    title: 'remote + Socket.IO + Keycloak',
    env: `NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=socketio
NFZ_REMOTE_URL=https://api.domain.ltd
NFZ_REMOTE_REST_PATH=/api/v1
NFZ_REMOTE_WS_PATH=/socket.io
NFZ_REMOTE_AUTH_PAYLOAD_MODE=keycloak
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=access_token
NFZ_KEYCLOAK_ENABLED=true
KC_URL=https://sso.example.com
KC_REALM=myrealm
KC_CLIENT_ID=myclient`,
    checks: [
      'Le provider détecté est keycloak',
      'Login redirect / silent SSO fonctionne',
      'Le token Keycloak est injecté dans authenticate(payload)',
      'whoami()/updateToken()/logout() fonctionnent sur /tests',
    ],
  },
])
</script>

<template>
  <div style="padding: 16px; max-width: 1100px; margin: 0 auto; display: grid; gap: 18px;">
    <div>
      <h1>Playground — scénarios de validation</h1>
      <p>Scénario détecté : <strong>{{ title }}</strong> (<code>{{ scenarioId }}</code>)</p>
      <p>Provider détecté : <code>{{ auth.provider }}</code></p>
      <p><NuxtLink to="/tests">Ouvrir la page de tests</NuxtLink></p>
      <pre style="white-space: pre-wrap">{{ publicClient }}</pre>
    </div>

    <div v-for="scenario in scenarios" :key="scenario.id" style="border: 1px solid #ddd; border-radius: 12px; padding: 16px;">
      <h2 style="margin-top: 0">{{ scenario.title }}</h2>
      <p v-if="scenario.id === scenarioId" style="color: #166534"><strong>Scénario actif</strong></p>
      <h3>Variables d’environnement</h3>
      <pre style="white-space: pre-wrap">{{ scenario.env }}</pre>
      <h3>Checks à valider</h3>
      <ul>
        <li v-for="item in scenario.checks" :key="item">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>
