---
editLink: false
---
# Modes : embedded, remote, hybride

`nuxt-feathers-zod` supporte deux modes principaux côté client, plus un cas hybride fréquent avec Keycloak.

## 1) Embedded

Le serveur Feathers tourne **dans la même app Nuxt 4**.

### Quand choisir embedded

- monolithe Nuxt + API
- démarrage rapide
- stack simple à déployer
- besoin de générer services + auth dans un même repo

### Exemple nouvelle app Nuxt 4

```bash
bunx nuxi@latest init my-nfz-embedded
cd my-nfz-embedded
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --framework express --force
bunx nuxt-feathers-zod add service messages
bun dev
```

### Effet attendu

- serveur embedded activé
- transport REST local actif
- transport Socket.IO local actif
- client Nuxt relié à ce serveur local

## 2) Remote

Nuxt ne démarre aucun serveur Feathers. Il configure un **client** vers une API Feathers externe.

### Quand choisir remote

- backend Feathers déjà existant
- séparation frontend/backend
- microservices
- API distante mutualisée

### Exemple nouvelle app Nuxt 4

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## 3) Cas hybride : remote + Keycloak SSO

Cas fréquent :

- Keycloak gère l’identité côté navigateur
- Feathers gère la session applicative côté API

Le navigateur obtient un token Keycloak, puis le module appelle `authentication.create(...)` pour matérialiser une session Feathers.

### Exemple

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

## Quelle stratégie choisir ?

### Embedded

Choisis embedded si tu veux :

- le plus simple pour démarrer,
- tester rapidement les services générés,
- centraliser Nuxt + Feathers + auth dans le même projet.

### Remote

Choisis remote si tu veux :

- une séparation claire frontend/backend,
- connecter Nuxt à un backend existant,
- ne pas embarquer le serveur Feathers dans Nitro.

## Invariants à garder stables

Pour le core open source, les invariants recommandés sont :

- `servicesDirs: ['services']`
- embedded = serveur Feathers dans Nitro
- remote = pas de serveur embedded local
- `init embedded` et `init remote` sont les points d’entrée officiels
- `runtimeConfig.public._feathers` doit refléter proprement le mode réel
