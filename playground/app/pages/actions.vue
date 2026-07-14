<script setup lang="ts">
const auth = useAuth()
await auth.init()

const api = useNuxtApp().$api

const form = reactive<{ action: string, payload: string }>({
  action: 'reindex',
  payload: '{"dryRun":true}',
})

const result = ref<any>(null)
const error = ref<string | null>(null)
const running = ref(false)

function parsePayload(raw: string) {
  try {
    return raw?.trim() ? JSON.parse(raw) : undefined
  }
  catch (e: any) {
    throw new Error(`Invalid JSON payload: ${e?.message || String(e)}`)
  }
}

async function runAction() {
  error.value = null
  result.value = null
  running.value = true
  try {
    const payload = parsePayload(form.payload)
    const res = await api.service('actions').run({ action: form.action, payload })
    result.value = res
  }
  catch (e: any) {
    error.value = e?.message || String(e)
  }
  finally {
    running.value = false
  }
}

const authenticated = computed(() => auth.isAuthenticated.value)
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Méthode personnalisée"
      title="Actions métier"
      description="Testez une méthode Feathers sans adaptateur avec un payload JSON contrôlé."
    >
      <template #actions>
        <PlaygroundStatusBadge :label="authenticated ? 'Session active' : 'Connexion requise'" :tone="authenticated ? 'success' : 'warning'" />
      </template>
    </PlaygroundPageHeader>

    <p v-if="!authenticated" class="nfz-alert nfz-alert--warning">
      La méthode <code>actions.run()</code> est protégée. Connectez-vous depuis le tableau de bord avant de lancer le test.
    </p>

    <PlaygroundPanel title="Exécuter une action" description="Le contenu JSON est analysé localement avant l’appel au service.">
      <form class="nfz-form-stack" @submit.prevent="runAction">
        <label>
          Nom de l’action
          <input v-model.trim="form.action" placeholder="reindex" required>
        </label>
        <label>
          Payload JSON
          <textarea v-model="form.payload" rows="7" placeholder="{&quot;dryRun&quot;:true}" />
        </label>
        <div class="nfz-actions">
          <button class="nfz-button nfz-button--primary" type="submit" :disabled="running">
            {{ running ? 'Exécution…' : 'Exécuter actions.run()' }}
          </button>
          <NuxtLink to="/messages" class="nfz-button">Tester le CRUD protégé</NuxtLink>
        </div>
      </form>
    </PlaygroundPanel>

    <p v-if="error" class="nfz-alert nfz-alert--danger">{{ error }}</p>
    <PlaygroundJsonPanel v-if="result" title="Résultat du service" :value="result" :collapsed="false" />
  </div>
</template>
