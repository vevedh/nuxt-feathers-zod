# API runtime

Le runtime expose les composables et helpers utilisés par les applications Nuxt.

## Composables principaux

| API | Usage |
|---|---|
| `useFeathers()` | Accès au client Feathers configuré par le module. |
| `useService(path)` | Accès typé ou direct à un service Feathers. |
| `useRawService(path)` | Accès au service sans couche d'aide supplémentaire. |
| `useAuth()` | API d'authentification simple pour login, logout et restauration. |
| `useAuthRuntime()` | Runtime d'authentification avancé avec état et événements. |
| `useProtectedService(path)` | Accès à un service nécessitant une session valide. |
| `useProtectedPage()` | Aide à la protection des pages Nuxt. |
| `useMongoManagementClient()` | Client pour la surface MongoDB management. |
| `useNfzAdminClient()` | Client pour les API d'administration NFZ. |

## Exemple service

```vue
<script setup lang="ts">
const users = useService('users')

const { data, refresh } = await useAsyncData('users', () => {
  return users.find({ query: { $limit: 10 } })
})
</script>

<template>
  <button type="button" @click="refresh()">Recharger</button>
  <pre>{{ data }}</pre>
</template>
```

## Exemple auth

```ts
const auth = useAuthRuntime()

await auth.authenticate({
  strategy: 'local',
  email: 'admin@example.local',
  password: 'change-me',
})

const snapshot = auth.getStateSnapshot()
```

## Accès protégé

```ts
const articles = await useProtectedService('articles')
await articles.find({ query: { $limit: 20 } })
```

## Événements runtime

`useAuthRuntime()` conserve des événements de diagnostic utiles pour suivre :

- l'initialisation ;
- la restauration de session ;
- l'authentification ;
- le bridge SSO ;
- les routes protégées ;
- les erreurs d'authentification.

Voir la page [Événements et hooks](/reference/events).
