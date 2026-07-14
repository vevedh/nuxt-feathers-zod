<script setup lang="ts">
definePageMeta({ ssr: false })

const authFacade = useAuth()
const auth = useAuthRuntime()
const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const trace = useAuthTrace()
const bridge = useKeycloakBridge()
const { title, scenarioId, clientMode } = usePlaygroundScenario()
const page = useProtectedPage({
  auth: 'optional',
  validateBearer: true,
  reason: 'playground-auth-runtime',
  stableUntilMounted: true,
})

const busy = ref(false)
const actionError = ref<string | null>(null)

const latestEvents = computed(() => trace.value.items.slice(0, 12))
const anonymousHint = computed(() => {
  if (diagnostics.value.status === 'anonymous' && !diagnostics.value.authenticated && !diagnostics.value.hasAccessToken)
    return 'Aucun token stocké : état anonyme normal tant qu’aucune session locale/SSO n’a encore été créée.'
  return null
})

async function runAction(label: string, task: () => Promise<any>) {
  busy.value = true
  actionError.value = null
  try {
    await task()
  }
  catch (error: any) {
    actionError.value = error?.message || String(error)
    console.warn(`[playground/auth-runtime] ${label} failed`, error)
  }
  finally {
    busy.value = false
  }
}

onMounted(async () => {
  await runAction('init', async () => {
    await authFacade.init()
    await page.ensure()
  })
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Diagnostic avancé"
      title="Runtime d’authentification"
      description="Inspectez l’état de session, la synchronisation des clients, le bridge Keycloak et la chronologie des événements d’authentification."
    >
      <template #actions>
        <NuxtLink to="/tests" class="nfz-button nfz-button--primary">Tests essentiels</NuxtLink>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Scénario</span><strong>{{ title }}</strong><small>{{ scenarioId }} · {{ clientMode }}</small></article>
      <article class="nfz-stat-card"><span>Fournisseur</span><strong>{{ diagnostics.provider }}</strong><small>État : {{ diagnostics.status }}</small></article>
      <article class="nfz-stat-card"><span>Session</span><strong>{{ diagnostics.authenticated ? 'Authentifiée' : 'Anonyme' }}</strong><small>Token : {{ diagnostics.tokenSource }}</small></article>
    </div>

    <PlaygroundPanel title="Commandes runtime" description="Chaque commande met à jour les diagnostics et la trace sans recharger la page.">
      <div class="nfz-actions">
        <button class="nfz-button" type="button" :disabled="busy" @click="runAction('init', () => authFacade.init())">Initialiser</button>
        <button class="nfz-button" type="button" :disabled="busy" @click="runAction('ensureReady', () => auth.ensureReady('playground-auth-runtime:button'))">Attendre la disponibilité</button>
        <button class="nfz-button" type="button" :disabled="busy" @click="runAction('reAuthenticate', () => auth.reAuthenticate())">Restaurer la session</button>
        <button v-if="auth.provider.value === 'keycloak'" class="nfz-button" type="button" :disabled="busy" @click="runAction('bridge', () => bridge.ensureSynchronized('playground-auth-runtime:button'))">Synchroniser Keycloak</button>
        <button v-if="auth.provider.value === 'keycloak'" class="nfz-button" type="button" :disabled="busy" @click="runAction('validateBearer', () => auth.ensureValidatedBearer('playground-auth-runtime:button'))">Valider le bearer</button>
        <button class="nfz-button nfz-button--ghost" type="button" :disabled="busy" @click="auth.clearEvents()">Effacer les événements</button>
        <button class="nfz-button nfz-button--ghost" type="button" :disabled="busy" @click="auth.resetDiagnostics()">Réinitialiser les diagnostics</button>
      </div>
      <p v-if="actionError" class="nfz-alert nfz-alert--danger">{{ actionError }}</p>
      <p v-else-if="anonymousHint" class="nfz-alert">{{ anonymousHint }}</p>
    </PlaygroundPanel>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Hydratation</span><strong>{{ diagnostics.hydrationState }}</strong><small>État stable côté client</small></article>
      <article class="nfz-stat-card"><span>Page protégée</span><strong>{{ page.displayState }}</strong><small>Autorisée : {{ page.authorized }}</small></article>
      <article class="nfz-stat-card"><span>Événements</span><strong>{{ latestEvents.length }}</strong><small>12 derniers au maximum</small></article>
    </div>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundJsonPanel title="Snapshot d’authentification" :value="diagnostics" :collapsed="false" />
      <PlaygroundJsonPanel title="Derniers événements" :value="latestEvents" :collapsed="false" />
    </div>
  </div>
</template>
