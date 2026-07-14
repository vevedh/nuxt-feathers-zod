<script setup lang="ts">
const auth = useAuth()
onMounted(() => { auth.init().catch(() => {}) })
const { publicClient, clientMode, scenarioId, title, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()

const scenarios = computed(() => [
  {
    id: 'embedded-local',
    title: 'embedded + auth local',
    env: `NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=false`,
    checks: [
      'Page / charge sans erreur',
      'Login local sur / fonctionne',
      'reAuthenticate() fonctionne sur /tests',
      'Services embedded memory (messages/users/actions) répondent',
    ],
  },
  {
    id: 'embedded-local-mongo',
    title: 'embedded + auth local + MongoDB memory',
    env: `NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=true`,
    checks: [
      'MongoMemoryServer démarre',
      'Le service mongos répond',
      'Les services Mongo générés répondent',
      'Le seed mongos s’exécute sans erreur bloquante',
    ],
  },
  {
    id: 'embedded-local-mongo-url',
    title: 'embedded + auth local + MongoDB URL',
    env: `NFZ_CLIENT_MODE=embedded
NFZ_KEYCLOAK_ENABLED=false
NFZ_PLAYGROUND_EMBEDDED_MONGODB=true
NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL=mongodb://root:changeMe@localhost:27017/app?authSource=admin`,
    checks: [
      'Aucun MongoMemoryServer local n’est démarré',
      'La base Mongo externe est joignable',
      'Le service mongos répond',
      'Le mode détecté dans /validation et /tests est url',
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
NFZ_REMOTE_REST_PATH=/
NFZ_KEYCLOAK_ENABLED=false`,
    checks: [
      'Test connection sur /tests via endpoint REST simple puis query Feathers ($limit)',
      'Pas de dépendance Socket.IO requise',
      'authenticate(payload) ou reAuthenticate() fonctionne',
      'users est joignable côté REST',
    ],
  },
  {
    id: 'remote-socketio-jwt',
    title: 'remote + Socket.IO + JWT stocké',
    env: `NFZ_CLIENT_MODE=remote
NFZ_REMOTE_TRANSPORT=socketio
NFZ_REMOTE_URL=http://localhost:3030
NFZ_REMOTE_REST_PATH=/
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


const scenarioFilter = ref<'all' | 'embedded' | 'remote'>('all')
const authProviderLabel = computed(() => auth.provider.value || 'none')
const filteredScenarios = computed(() => {
  if (scenarioFilter.value === 'all') return scenarios.value
  return scenarios.value.filter(scenario => scenario.id.startsWith(scenarioFilter.value))
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Matrice de validation"
      title="Scénarios de fonctionnement"
      description="Retrouvez les variables d’environnement et les contrôles attendus pour chaque combinaison embedded, REST, Socket.IO, MongoDB et Keycloak."
    >
      <template #actions>
        <NuxtLink to="/tests" class="nfz-button nfz-button--primary">Lancer les tests essentiels</NuxtLink>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card">
        <span>Scénario actif</span>
        <strong>{{ title }}</strong>
        <small>{{ scenarioId }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>Client</span>
        <strong>{{ clientMode }}</strong>
        <small>Auth : {{ authProviderLabel }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>MongoDB</span>
        <strong>{{ embeddedMongoMode }}</strong>
        <small>{{ embeddedMongoEnabled ? 'Activé' : 'Désactivé' }}</small>
      </article>
    </div>

    <PlaygroundPanel
      title="Choisir un scénario"
      description="Le scénario courant reste ouvert automatiquement. Les autres peuvent être consultés sans modifier la configuration."
    >
      <template #actions>
        <div class="nfz-segmented" aria-label="Filtrer les scénarios">
          <button type="button" :aria-pressed="scenarioFilter === 'all'" @click="scenarioFilter = 'all'">Tous</button>
          <button type="button" :aria-pressed="scenarioFilter === 'embedded'" @click="scenarioFilter = 'embedded'">Embedded</button>
          <button type="button" :aria-pressed="scenarioFilter === 'remote'" @click="scenarioFilter = 'remote'">Distant</button>
        </div>
      </template>

      <div class="nfz-grid">
        <details
          v-for="scenario in filteredScenarios"
          :key="scenario.id"
          class="nfz-scenario-card"
          :open="scenario.id === scenarioId"
        >
          <summary>
            <div>
              <strong>{{ scenario.title }}</strong>
              <p class="nfz-muted">{{ scenario.id }}</p>
            </div>
            <PlaygroundStatusBadge
              :label="scenario.id === scenarioId ? 'Actif' : 'Disponible'"
              :tone="scenario.id === scenarioId ? 'success' : 'neutral'"
            />
          </summary>
          <div class="nfz-scenario-card__content">
            <div>
              <h3>Variables d’environnement</h3>
              <pre>{{ scenario.env }}</pre>
            </div>
            <div>
              <h3>Contrôles attendus</h3>
              <ul>
                <li v-for="check in scenario.checks" :key="check">{{ check }}</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </PlaygroundPanel>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundPanel title="Raccourcis de validation" description="Ouvrez directement le transport ou le backend correspondant au scénario à vérifier.">
        <div class="nfz-feature-grid">
          <PlaygroundFeatureCard title="Mode embedded" description="Backend local et services intégrés" to="/embedded" icon="◉" />
          <PlaygroundFeatureCard title="REST distant" description="Requêtes HTTP et client Feathers" to="/remote/rest" icon="⇄" />
          <PlaygroundFeatureCard title="Socket.IO distant" description="Connexion temps réel et reconnexion" to="/remote/socketio" icon="↯" />
          <PlaygroundFeatureCard title="MongoDB" description="Gestion des bases et collections" to="/mongo" icon="◆" />
        </div>
      </PlaygroundPanel>

      <PlaygroundJsonPanel title="Configuration publique active" :value="publicClient" :collapsed="false" />
    </div>
  </div>
</template>
