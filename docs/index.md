---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod + Nuxt 4 (Nitro)"
  tagline: "Framework backend-first pour Nuxt 4 : backend Feathers embarqué (embedded) OU client Feathers vers un serveur distant (remote). Génération Zod-first, client Pinia, Swagger (legacy) et option Keycloak SSO."
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
  - title: "Backend-first pour Nuxt"
    details: "NFZ vise la construction et l’exploitation d’un backend Feathers dans l’écosystème Nuxt, pas seulement un SDK de connexion."
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

## Démarrer d'abord par la création de l'app Nuxt 4

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

## Quickstart

### Embedded

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### Remote

```bash
bunx nuxt-feathers-zod init remote --url https://api.example --force
bun dev
```

### Upload/download de fichiers

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

- Guide dédié : [Service d'upload/download de fichiers](/guide/file-upload-download)
- Guide principal : [Démarrage rapide](/guide/getting-started)

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


## Démos produit

- [NFZ vs Supabase](/guide/nfz-vs-supabase)
- [Roadmap vNext](/guide/roadmap-vnext)
- [Démos produit](/guide/product-demos)

- [Builder Studio](/guide/builder-studio) — presets métier, CLI parity et apply checklist


- [Builder Studio](/guide/builder-studio) — presets, starters métier et hooks séparés


## Builder Studio 6.4.63

- barrels optionnels : `index.ts` dans le dossier service, et en option `services/index.ts`
- starter `users` rapproché des conventions NFZ local auth (`passwordHash`, masquage du mot de passe côté external resolver)
- apply builder plus proche d’un layout de démonstration CLI-first


## 6.4.64

- Builder Studio: `services/index.ts` peut maintenant être agrégé à partir de plusieurs services marqués `service+root`.
- Le preview et l'apply utilisent la liste complète du manifest pour produire un root barrel cohérent avec plusieurs services.


## 6.4.65
Le parcours **Services Manager** distingue désormais plus clairement les services **Démo builder**, les **Services scannés** et les **Brouillons libres**, afin de rendre les tests simples plus compréhensibles dans l'app de démonstration.


## 6.4.66

- Builder Studio : onglet **Presets** dédié pour les presets officiels et les starters métier, afin de les rendre visibles et accessibles sans long scroll.


## 6.4.67

- Builder Studio : filtre rapide par origine dans le sidebar (`Tous`, `Démo`, `Scannés`, `Brouillons`).
- Builder Studio : scroll local corrigé sur la zone `Presets` / `Starters`.

## 6.4.68

- Builder Studio : ajout de **modes de vue** pédagogiques (`Tests rapides`, `Services réels`, `Builder avancé`).
- Builder Studio : le mode de vue pilote désormais le focus de l'écran pour les démos, les services scannés ou le workflow complet.

## 6.4.69

- Services Manager ajoute trois cartes d’entrée guidées : tests rapides, services réels et builder avancé.
- Le parcours devient plus lisible avant même d’ouvrir les onglets Workflow / Presets / Workspace.

## 6.4.71 — License Center
- documentation du License Center et des composants réutilisables de gestion de licence / feature gating pour les futures options premium de NFZ

- [License Center](./guide/license-center)

- [Admin client runtime helper](/guide/admin-client)

- Builder client: `/guide/builder-client`


- Builder playground validation: `/guide/builder-playground`

- [Flux de développement du dépôt](./guide/repo-dev.md)
