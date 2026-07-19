# Utiliser les services dans Vue

Le module injecte un client Feathers dans l’application Nuxt. Vous pouvez appeler un service depuis une page, un composant, un composable ou un store Pinia.

## Lire une liste

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
  <p v-if="loading">Chargement…</p>
  <ul v-else>
    <li v-for="message in messages" :key="message.id">
      {{ message.text }}
    </li>
  </ul>
</template>
```

## Créer une donnée

```ts
await $api.service('messages').create({
  text: 'Bonjour depuis Nuxt',
})
```

Le serveur valide la donnée avec le schéma du service. Ne faites pas confiance à la seule validation du formulaire navigateur.

## Écouter les événements

```ts
const service = $api.service('messages')

function onCreated(message: Message): void {
  messages.value.unshift(message)
}

onMounted(() => service.on('created', onCreated))
onBeforeUnmount(() => service.off('created', onCreated))
```

## Utiliser l’authentification

```ts
const auth = useAuth()

await auth.login({
  strategy: 'local',
  email: 'developer@example.test',
  password: 'mot-de-passe-de-test',
})
```

Pour protéger une page, utilisez le middleware de session généré ou contrôlez `auth.isAuthenticated` avant d’afficher une fonction sensible.

## Bonnes pratiques

- Typpez les données retournées par chaque service.
- Limitez les requêtes avec `$limit`, `$select` et des filtres validés.
- Nettoyez les listeners Feathers quand le composant est démonté.
- Centralisez les appels répétés dans un composable ou un store Pinia.
- Affichez un message utilisateur simple et journalisez séparément le diagnostic technique.

<!-- release-version: 6.6.0 -->
