<script setup lang="ts">
definePageMeta({ middleware: ['auth'], ssr: false })

// create message
const text = import.meta.server ? 'Hello, world! (server)' : 'Hello, world! (client)'
await useService('messages').create({ text })

// get messages
const params = computed(() => ({ query: { $limit: 20 } }))
const messages = useService('messages').useFind<Message>(params, { paginateOn: 'hybrid' })

// add message
const newMessage = ref('')
async function addMessage() {
  console.log('newMessage.value:', newMessage.value)
  await useService('messages').create({ text: newMessage.value })
}

const auth = useAuth()
await auth.init()

const displayUser = computed(() => {
  const u = auth.user.value
  if (!u) {
    return '(none)'
  }
  return u.userId || u.preferred_username || u.email || u.name || u._id || JSON.stringify(u)
})

async function logout() {
  await auth.logout()
  await navigateTo('/')
}
</script>

<template>
  <div style="max-width: 300px;">
    <button style="float:right" @click="logout">
      Logout
    </button>
    <h2>
      <span style="padding-right: 40px;">
        Provider: <strong>{{ auth.provider }}</strong><br>
        User: <strong>{{ displayUser }}</strong>
      </span>
    </h2>
    <div>Add your message:</div>
    <input v-model="newMessage" placeholder="message">
    <button @click="addMessage">
      Add message
    </button>
    <h3>Total: {{ messages.total }}</h3>
    <p v-for="message in messages.data" :key="message.id">
      {{ message.id }}: {{ message.text }}
    </p>
  </div>
</template>
