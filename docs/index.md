---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod + Nuxt 4 (Nitro)"
  tagline: "Deux modes : backend Feathers embarqué (embedded) OU client Feathers vers un serveur distant (remote). Génération Zod-first, client Pinia, Swagger (legacy) et option Keycloak SSO."
  image:
    src: https://vevedh.github.io/nuxt-feathers-zod/images/plume-dark.png
    alt: Logo plume
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Configuration
      link: /reference/config

features:
  - title: "Backend dans Nitro"
    details: "Mode embedded : Feathers tourne dans le même runtime que ton Nuxt 4 (Nitro)."
  - title: "Remote (Socket.IO first)"
    details: "Mode remote : connecte un client Feathers vers un backend externe. Socket.IO recommandé, REST supporté."
  - title: "Zod-first"
    details: "Schemas Zod générés, validation query/data, types partagés (client/server)."
  - title: "CLI officielle"
    details: "Services/middlewares générés de façon déterministe (ne pas créer manuellement)."
  - title: "Client DX"
    details: "useService + Pinia stores (feathers-pinia) + auth store (optionnel)."
  - title: "Swagger legacy"
    details: "Optionnel via feathers-swagger + swagger-ui-dist (DX au démarrage si manquant)."
  - title: "Keycloak SSO"
    details: "Mode Keycloak-only, SSO silencieux (check-sso) et routes protégées au cas par cas."
---

## Quickstart

### Embedded (serveur Feathers local)

```bash
bunx nuxt-feathers-zod init embedded --force
bun dev
```

### Remote (Socket.IO en priorité)

```bash
bunx nuxt-feathers-zod init remote --url https://api.example --force
bun dev
```

## Attention !

- Déclare `feathers.servicesDirs = ['services']`.
- Génère toujours les services via la CLI : `bunx nuxt-feathers-zod add service ...`.
- Pour activer le mode remote : `bunx nuxt-feathers-zod init remote --url http://...` (Socket.IO par défaut, REST via `--transport rest`).
- En mode remote, `feathers.templates.dirs` est **optionnel** (utile uniquement si tu veux surcharger des templates client).
- Si tu actives Keycloak : `auth.provider = 'keycloak'` et protège tes routes avec un middleware.

## Authentification (embedded + remote)

Le module supporte l’auth Feathers v5 (Dove) dans **les deux modes** :

- **JWT** (`strategy: 'jwt'`) via `@feathersjs/authentication`
- **Local** (`strategy: 'local'`) via `@feathersjs/authentication-local`
- **OAuth** (`strategy: 'oauth'`) via `@feathersjs/authentication-oauth`
- **Keycloak SSO** reste un mode possible (optionnel)

En **mode remote**, le module n’exige pas de schémas locaux (`services/**`) pour démarrer : l’`entityImport` est **optionnel**.

## Secure defaults (embedded / Express)

En mode **embedded**, le serveur REST (Express) peut activer un preset “secure defaults” :

- CORS (**ON** par défaut)
- compression
- helmet
- body parsing `json` + `urlencoded`
- `serveStatic` (optionnel)

Configuration :

```ts
export default defineNuxtConfig({
  feathers: {
    server: {
      secureDefaults: true,
      secure: {
        cors: true,
        helmet: true,
        compression: true,
        serveStatic: { path: '/', dir: 'public' } // ou false
      }
    }
  }
})
```
