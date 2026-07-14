<script setup lang="ts">
// Playground page: keep it client-only to avoid hydration mismatches after Keycloak redirects
// (SSR renders unauthenticated, then client hydrates with Keycloak user).
definePageMeta({ middleware: ['auth'], ssr: false })

type AnyClient = any

const nuxtApp = useNuxtApp() as any
const client: AnyClient = nuxtApp.$client || nuxtApp.$feathersClient
if (!client) {
  throw new Error('[playground/messages] Feathers client is not available on nuxtApp ($client/$feathersClient).')
}

const auth = useAuth()

const displayUser = computed(() => {
  const raw: any = (auth as any).user
  const u: any = (raw && typeof raw === 'object' && 'value' in raw) ? raw.value : raw
  return u?.email || u?.username || u?.preferred_username || u?.name || (u ? '[user]' : 'anonymous')
})

const isMounted = ref(false)

async function logout() {
  try {
    await auth.logout()
  }
  catch (e) {
    console.warn('[playground/messages] logout failed', e)
  }
}


const messages = ref<{ total: number, data: any[] }>({ total: 0, data: [] })
const loading = ref(false)
const error = ref<string | null>(null)

async function loadMessages() {
  loading.value = true
  error.value = null
  try {
    const res = await client.service('messages').find({ query: { $limit: 20 } })
    // Feathers pagination: { total, limit, skip, data }
    messages.value = Array.isArray(res)
      ? { total: res.length, data: res }
      : { total: (res?.total ?? (res?.data?.length ?? 0)), data: (res?.data || []) }
  }
  catch (e: any) {
    error.value = e?.message || String(e)
    // In remote mode, some backends won't expose the demo "messages" service.
    // Treat NotFound as a non-fatal diagnostic (show the error in UI, warn in console).
    const name = e?.name || ''
    const msg = String(e?.message || '')
    if (name === 'NotFound' || msg.includes('Page not found'))
      console.warn('[playground/messages] find failed (NotFound)', e)
    else
      console.error('[playground/messages] find failed', e)
  }
  finally {
    loading.value = false
  }
}

const newMessage = ref('')
async function addMessage() {
  if (!newMessage.value.trim())
    return
  error.value = null
  try {
    await client.service('messages').create({ text: newMessage.value.trim() })
    newMessage.value = ''
    await loadMessages()
  }
  catch (e: any) {
    error.value = e?.message || String(e)
    console.error('[playground/messages] create failed', e)
  }
}

onMounted(async () => {
  isMounted.value = true
  await loadMessages()
})


const authProviderLabel = computed(() => auth.provider.value || 'none')
</script>

<template>
  <ClientOnly>
    <div class="nfz-page">
      <PlaygroundPageHeader
        eyebrow="Service protégé"
        title="Messages"
        description="Validez la session, la lecture paginée et la création d’un enregistrement avec le service Feathers de démonstration."
      >
        <template #actions>
          <button class="nfz-button nfz-button--danger" type="button" @click="logout">Se déconnecter</button>
        </template>
      </PlaygroundPageHeader>

      <div class="nfz-grid nfz-grid--2">
        <article class="nfz-stat-card">
          <span>Fournisseur</span>
          <strong>{{ authProviderLabel }}</strong>
          <small>Utilisateur : {{ isMounted ? displayUser : 'chargement…' }}</small>
        </article>
        <article class="nfz-stat-card">
          <span>Messages</span>
          <strong>{{ messages.total }}</strong>
          <small>{{ messages.data.length }} élément(s) chargé(s)</small>
        </article>
      </div>

      <PlaygroundPanel title="Ajouter un message" description="La création est suivie d’un rechargement de la liste.">
        <form class="nfz-form-grid" @submit.prevent="addMessage">
          <label>
            Texte du message
            <input v-model.trim="newMessage" placeholder="Saisissez un message" maxlength="500">
          </label>
          <button class="nfz-button nfz-button--primary" type="submit" :disabled="!newMessage.trim()">Ajouter</button>
        </form>
        <p v-if="error" class="nfz-alert nfz-alert--danger">{{ error }}</p>
      </PlaygroundPanel>

      <PlaygroundPanel title="Enregistrements" description="Lecture du service messages avec une limite de 20 éléments.">
        <template #actions>
          <button class="nfz-button nfz-button--small" type="button" :disabled="loading" @click="loadMessages">
            {{ loading ? 'Actualisation…' : 'Actualiser' }}
          </button>
        </template>

        <div v-if="messages.data.length" class="nfz-table-wrap">
          <table class="nfz-table">
            <thead><tr><th>Identifiant</th><th>Message</th></tr></thead>
            <tbody>
              <tr v-for="message in messages.data" :key="message.id">
                <td><code>{{ message.id }}</code></td>
                <td>{{ message.text }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else-if="!loading" class="nfz-alert">Aucun message n’est encore enregistré.</p>
      </PlaygroundPanel>
    </div>
  </ClientOnly>
</template>
