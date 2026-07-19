# Use services from Vue

The module injects a Feathers client into your Nuxt application. You can call a service from a page, component, composable, or Pinia store.

## Read a list

```vue
<script setup lang="ts">
interface Message {
  id: string
  text: string
  createdAt: string
}

const { $api } = useNuxtApp()
const loading = ref(false)
const messages = ref<Message[]>([])

async function loadMessages(): Promise<void> {
  loading.value = true
  try {
    const result = await $api.service('messages').find({
      query: {
        $limit: 20,
        $sort: { createdAt: -1 },
      },
    })
    messages.value = Array.isArray(result) ? result : result.data
  }
  finally {
    loading.value = false
  }
}

await loadMessages()
</script>

<template>
  <p v-if="loading">Loading…</p>
  <ul v-else>
    <li v-for="message in messages" :key="message.id">
      {{ message.text }}
    </li>
  </ul>
</template>
```

## Create data

```ts
await $api.service('messages').create({
  text: 'Hello from Nuxt',
})
```

The server validates the payload with the service schema. Browser form validation is not a security boundary.

## Listen to events

```ts
const service = $api.service('messages')

function onCreated(message: Message): void {
  messages.value.unshift(message)
}

onMounted(() => service.on('created', onCreated))
onBeforeUnmount(() => service.off('created', onCreated))
```

## Use authentication

```ts
const auth = useAuth()

await auth.login({
  strategy: 'local',
  email: 'developer@example.test',
  password: 'test-password',
})
```

Use the generated session middleware for protected pages, or check `auth.isAuthenticated` before rendering a sensitive action.

## Good practices

- Type the data returned by each service.
- Bound queries with `$limit`, `$select`, and validated filters.
- Remove Feathers listeners when a component unmounts.
- Put repeated calls in a composable or Pinia store.
- Show a simple user-facing error and keep technical diagnostics separate.

<!-- release-version: 6.6.0 -->
