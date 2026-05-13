# Runtime API

The runtime exposes the composables and helpers used by Nuxt applications.

## Main composables

| API | Usage |
|---|---|
| `useFeathers()` | Access the Feathers client configured by the module. |
| `useService(path)` | Access a typed or direct Feathers service. |
| `useRawService(path)` | Access the service without additional helper layers. |
| `useAuth()` | Simple authentication API for login, logout and restore. |
| `useAuthRuntime()` | Advanced authentication runtime with state and events. |
| `useProtectedService(path)` | Access a service that requires a valid session. |
| `useProtectedPage()` | Helper for protecting Nuxt pages. |
| `useMongoManagementClient()` | Client for the MongoDB management surface. |
| `useNfzAdminClient()` | Client for NFZ administration APIs. |

## Service example

```vue
<script setup lang="ts">
const users = useService('users')

const { data, refresh } = await useAsyncData('users', () => {
  return users.find({ query: { $limit: 10 } })
})
</script>

<template>
  <button type="button" @click="refresh()">Reload</button>
  <pre>{{ data }}</pre>
</template>
```

## Auth example

```ts
const auth = useAuthRuntime()

await auth.authenticate({
  strategy: 'local',
  email: 'admin@example.local',
  password: 'change-me',
})

const snapshot = auth.getStateSnapshot()
```

## Protected access

```ts
const articles = await useProtectedService('articles')
await articles.find({ query: { $limit: 20 } })
```

## Runtime events

`useAuthRuntime()` stores diagnostic events that help track:

- initialization;
- session restoration;
- authentication;
- SSO bridge operations;
- protected routes;
- authentication failures.

See [Events and hooks](/en/reference/events).
