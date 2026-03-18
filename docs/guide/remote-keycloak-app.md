---
editLink: false
---
# Exemple complet : app Nuxt 4 en mode remote + Keycloak + service distant

Cette page montre une **mini-application Nuxt 4** qui utilise :

- `nuxt-feathers-zod` en **mode remote**
- Keycloak comme source d'identité navigateur
- le middleware de route `auth-keycloak`
- un appel à un **service Feathers distant** via `useService()`

L'objectif est de fournir un scénario simple, concret et directement réutilisable.

## Ce que fait l'exemple

- l'application démarre en mode **remote**
- Keycloak est initialisé en `check-sso`
- la route `/private` est protégée par `auth-keycloak`
- la page `/private` appelle le service distant `messages`
- le Bearer Keycloak est envoyé automatiquement au backend Feathers distant

## 1) Création du projet

```bash
bunx nuxi@latest init my-nfz-remote-keycloak
cd my-nfz-remote-keycloak
bun install
bun add nuxt-feathers-zod feathers-pinia keycloak-js
bun add -D @pinia/nuxt
```

## 2) Initialisation du mode remote

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## 3) Déclaration de Keycloak

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId my-nuxt-app
```

## 4) Génération du middleware de route

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

## 5) Déclaration d'un service distant

Ici on expose le service `messages` côté client Nuxt.

```bash
bunx nuxt-feathers-zod add remote-service messages \
  --path messages \
  --methods find,get
```

## 6) Fichier `nuxt.config.ts`

Exemple minimal cohérent après les commandes CLI :

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/feathers',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
        },
        services: [
          {
            path: 'messages',
            methods: ['find', 'get'],
          },
        ],
      },
    },
    auth: true,
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },
  },
})
```

## 7) Fichier `public/silent-check-sso.html`

Le générateur `auth-keycloak --target route` le crée automatiquement si besoin.

```html
<!doctype html>
<html>
  <body>
    <script>
      parent.postMessage(location.href, location.origin)
    </script>
  </body>
</html>
```

## 8) Route protégée

Créer `app/pages/private.vue` :

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-keycloak'],
})

const messages = useService('messages')

const { data, pending, error, refresh } = await useAsyncData('remote-messages', () => {
  return messages.find({
    query: {
      $limit: 10,
    },
  })
})
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold">Zone privée</h1>
    <p>Cette page exige une authentification Keycloak.</p>

    <button type="button" @click="refresh()">
      Recharger
    </button>

    <div v-if="pending">Chargement…</div>
    <pre v-else-if="error">{{ error }}</pre>
    <pre v-else>{{ data }}</pre>
  </div>
</template>
```

## 9) Page publique optionnelle

Créer `app/pages/index.vue` :

```vue
<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold">Demo NFZ remote + Keycloak</h1>
    <p>Page publique.</p>
    <NuxtLink to="/private">
      Aller vers la page protégée
    </NuxtLink>
  </div>
</template>
```

## 10) Ce qui se passe à l'exécution

1. la page `/private` déclenche le middleware `auth-keycloak`
2. si l'utilisateur n'est pas authentifié, Keycloak lance le login
3. après retour, le plugin SSO côté client dispose du token Keycloak
4. le client NFZ envoie automatiquement le Bearer au backend Feathers distant
5. `useService('messages').find(...)` appelle le service distant avec ce token

## 11) Pré-requis côté backend distant

Le backend Feathers distant doit :

- exposer le service `authentication`
- accepter la stratégie `jwt`
- accepter un payload du type :

```ts
{
  strategy: 'jwt',
  access_token: '<token_keycloak>'
}
```

- valider le token Keycloak côté serveur
- protéger le service `messages` selon sa politique d'authentification

## 12) Variante Socket.IO

Le même scénario fonctionne en Socket.IO si le backend est déjà validé dans ce mode :

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

Pour un premier diagnostic, REST reste recommandé car il permet d'isoler plus facilement :

- l'URL de l'API
- les erreurs CORS
- les erreurs HTTP
- les erreurs de mapping du payload Keycloak

## 13) Commandes de test rapide

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add remote-service messages --path messages --methods find,get
bun dev
```

Puis ouvrir :

```txt
http://localhost:3000/private
```

## 14) Résumé

Ce scénario est le **point d'entrée recommandé** si tu veux :

- une app Nuxt 4 séparée du backend Feathers
- un SSO navigateur via Keycloak
- des routes protégées au niveau Nuxt
- des appels à des services Feathers distants déjà existants

Voir aussi :

- [Mode remote](./remote)
- [Keycloak SSO](./keycloak-sso)
- [Frontend](./frontend)
- [Middleware](../reference/middleware)
