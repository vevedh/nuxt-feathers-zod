<script setup lang="ts">
import { storeToRefs } from 'pinia'

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

const auth = useAuthStore()
const { user } = storeToRefs(auth)

function logout() {
  auth.logout()
}
</script>

<template>
  <div style="max-width: 300px;">
    <button style="float:right" @click="logout">
      Logout
    </button>
    <h2>
      <span style="padding-right: 40px;">
        User: <strong>{{ user?.userId }}</strong>
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
