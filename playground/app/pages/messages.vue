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
</script>

<template>
  <ClientOnly>
    <div style="max-width: 300px;">
      <button style="float:right" @click="logout">
        Logout
      </button>
      <h2>
        <span style="padding-right: 40px;">
          Provider: <strong>{{ auth.provider }}</strong>
          <br />
          User: <strong>{{ isMounted ? displayUser : '...' }}</strong>
        </span>
      </h2>

      <div>Add your message:</div>
      <input v-model="newMessage" placeholder="message" />
      <button @click="addMessage">
        Add message
      </button>

      <p v-if="error" style="color: #b91c1c; white-space: pre-wrap;">
        {{ error }}
      </p>

      <h3>Total: {{ messages.total }}</h3>
      <p v-for="message in messages.data" :key="message.id">
        {{ message.id }}: {{ message.text }}
      </p>
    </div>
  </ClientOnly>
</template>
