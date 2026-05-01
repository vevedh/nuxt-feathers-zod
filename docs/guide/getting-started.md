# Démarrage rapide

Ce guide te permet de lancer une application Nuxt 4 avec `nuxt-feathers-zod`, puis de créer ton premier service Feathers.

## Objectif

À la fin de cette page, tu auras :

- une application Nuxt 4 ;
- le module `nuxt-feathers-zod` installé ;
- un serveur Feathers embarqué dans Nitro ;
- un service `messages` accessible en REST ;
- une base claire pour activer Zod, MongoDB ou l’auth ensuite.

## Prérequis

- Node.js compatible Nuxt 4 ;
- Bun comme gestionnaire de paquets ;
- des bases TypeScript/Nuxt.

## 1. Créer le projet

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
```

## 2. Initialiser NFZ en mode embedded

```bash
bunx nuxt-feathers-zod init embedded --force
```

Le CLI met à jour `nuxt.config.ts` et prépare les conventions nécessaires au runtime Feathers.

Configuration minimale attendue :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],
    client: {
      mode: 'embedded',
    },
    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },
    server: {
      enabled: true,
      framework: 'express',
    },
  },
})
```

## 3. Générer un service

```bash
bunx nuxt-feathers-zod add service messages \
  --adapter memory \
  --schema zod
```

Structure générée :

```txt
services/messages/
├─ messages.ts
├─ messages.class.ts
├─ messages.schema.ts
└─ messages.shared.ts
```

## 4. Démarrer l’application

```bash
bun dev
```

Teste le service :

```http
GET http://localhost:3000/feathers/messages
```

## 5. Utiliser le client côté Nuxt

```vue
<script setup lang="ts">
interface Message {
  id?: number
  text: string
}

const messages = ref<Message[]>([])
const text = ref('Bonjour NFZ')
const loading = ref(false)

async function loadMessages() {
  loading.value = true
  try {
    const { $api } = useNuxtApp()
    const result = await $api.service('messages').find({
      query: {
        $limit: 20,
      },
    })

    messages.value = Array.isArray(result) ? result : result.data
  }
  finally {
    loading.value = false
  }
}

async function createMessage() {
  const { $api } = useNuxtApp()
  await $api.service('messages').create({ text: text.value })
  text.value = ''
  await loadMessages()
}

await loadMessages()
</script>

<template>
  <main>
    <h1>Messages</h1>

    <form @submit.prevent="createMessage">
      <input v-model="text" placeholder="Message">
      <button type="submit">Créer</button>
    </form>

    <p v-if="loading">Chargement...</p>

    <ul>
      <li v-for="message in messages" :key="message.id ?? message.text">
        {{ message.text }}
      </li>
    </ul>
  </main>
</template>
```

## Parcours suivants

- [Guide complet](/guide/complete-guide)
- [Modes embedded/remote](/guide/modes)
- [Services](/guide/services)
- [Auth locale](/guide/auth-local)
- [Starter Quasar + UnoCSS + Pinia](/guide/starter-quasar-unocss-pinia)

## Bonnes pratiques

- Garde `servicesDirs: ['services']` comme convention par défaut.
- Génère tes services avec le CLI.
- Active `--schema zod` dès que le service porte une donnée métier durable.
- Ajoute MongoDB seulement lorsque le modèle est stabilisé.
- Centralise les appels Feathers dans un composable ou un store Pinia dès que l’UI grossit.
