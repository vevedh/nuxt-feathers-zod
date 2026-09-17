<script setup lang="ts">
const messages = useService('messages')
const rows = ref<Array<{ id: number, text: string }>>([])
const text = ref('Bonjour NFZ')

async function refresh() {
  const result = await messages.find({ query: { $limit: 20, $sort: { id: -1 } } })
  rows.value = Array.isArray(result) ? result : result.data
}

async function addMessage() {
  await messages.create({ text: text.value })
  text.value = ''
  await refresh()
}

onMounted(refresh)
</script>

<template>
  <main style="max-width: 760px; margin: 3rem auto; font-family: sans-serif">
    <h1>NFZ embedded + Memory</h1>
    <p>Un service Feathers local, Zod et le client NFZ dans la même application Nuxt.</p>
    <form @submit.prevent="addMessage">
      <input v-model="text" required placeholder="Message" />
      <button type="submit">
        Ajouter
      </button>
    </form>
    <ul>
      <li v-for="message in rows" :key="message.id">
        #{{ message.id }} — {{ message.text }}
      </li>
    </ul>
  </main>
</template>
