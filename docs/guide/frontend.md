---
editLink: false
---
# Utilisation frontend

Cette page remplace l’ancien contenu de maintien de navigation par une explication opérationnelle des composables frontend (`useService`, `useFeathers`, `useProtectedService`, `useAuth`). Elle est destinée aux développeurs qui veulent comprendre l’option, l’activer dans `nuxt.config.ts` et vérifier son comportement dans un projet Nuxt 4.

## Objectif

Les composables frontend (`useService`, `useFeathers`, `useProtectedService`, `useAuth`) permettent de garder une architecture cohérente entre le module Nuxt, le runtime Feathers, les services générés, le client TypeScript et le CLI. L’exemple ci-dessous donne une base directement réutilisable.

## Quand utiliser cette option ?

Utilise cette page lorsque tu veux :

- configurer précisément les composables frontend (`useService`, `useFeathers`, `useProtectedService`, `useAuth`) ;
- documenter le choix dans un starter ou une application ;
- tester rapidement le comportement avec une commande CLI ;
- éviter les divergences entre configuration, fichiers générés et runtime.

## Exemple de configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    client: { mode: 'embedded', pinia: true },
    servicesDirs: ['services'],
  }
})
```

## Exemple CLI

```bash
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod --force
```

## Exemple d’utilisation

```vue
<script setup lang="ts">
interface Message {
  id: string | number
  text: string
}

const messagesService = useService('messages')
const messages = ref<Message[]>([])

async function loadMessages() {
  const result = await messagesService.find({
    query: { $limit: 20, $sort: { createdAt: -1 } },
  })
  messages.value = Array.isArray(result) ? result : result.data
}

async function createMessage() {
  await messagesService.create({ text: 'Bonjour depuis NFZ' })
  await loadMessages()
}

onMounted(loadMessages)
</script>

<template>
  <button @click="createMessage">Créer un message</button>
  <ul>
    <li v-for="message in messages" :key="message.id">
      {{ message.text }}
    </li>
  </ul>
</template>
```

## Points de vigilance

- Les chemins exposés (`/feathers`, `/socket.io`, `/mongo`, `/api/nfz`) doivent être documentés dans le projet applicatif.
- Les options qui exposent une surface d’administration doivent être protégées avant un déploiement hors local.
- Les services générés par le CLI restent préférables aux services écrits manuellement pour conserver le manifest, les types et les hooks.

## Bonnes pratiques

- Lance `bunx nuxt-feathers-zod doctor` après la modification.
- Utilise `--dry` avant les commandes qui écrivent dans le projet.
- Versionne les fichiers générés importants et documente toute option non standard.
- Teste un appel REST minimal avant de diagnostiquer le frontend.

<!-- release-version: 6.5.23 -->
