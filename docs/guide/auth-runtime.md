
> Note 6.4.130 : `ensureReady()` reste le propriétaire de l'état de bootstrap (`ready`), tandis que `reAuthenticate()` ne le force plus directement.
---
editLink: false
---
# Runtime auth unifié

Depuis `6.4.92+`, `nuxt-feathers-zod` fournit un runtime auth client unifié pour éviter les dérives entre :

- `$api`
- le client Feathers brut
- le store Pinia auth
- cookie / localStorage
- Keycloak SSO
- les outils runtime protégés

## Objectif

Éviter les cas où :

- le login réussit visuellement
- le bearer existe à un endroit
- mais une autre page protégée repart sans session exploitable

## Source de vérité : `useAuthRuntime()`

```ts
const auth = useAuthRuntime()
await auth.ensureReady()

console.log(auth.status.value)
console.log(auth.accessToken.value)
console.log(auth.user.value)
```


## Auth locale embedded : ne plus deviner les champs

Pour une UI de login custom en mode embedded, ne suppose plus que le backend attend forcément `email/password`.

Le runtime public expose maintenant la config locale résolue :

```ts
const pub = useRuntimeConfig().public
console.log(pub._feathers.auth.local)
```

Et le helper `buildLocalAuthPayload()` permet de construire le payload correct :

```ts
import { buildLocalAuthPayload } from 'nuxt-feathers-zod/auth-utils'

const auth = useRuntimeConfig().public._feathers.auth
const payload = buildLocalAuthPayload(login.value, password.value, auth?.local)
await useAuthRuntime().authenticate(payload)
```

Cela fonctionne de façon fiable parce que NFZ applique désormais aussi cette même configuration d’auth résolue côté serveur via `app.set('authentication', config)` avant de créer `AuthenticationService`.

## Routes HTTP protégées

```ts
const request = useAuthenticatedRequest()
const diagnostics = await request('/api/diagnostics/runtime')
```

## Services protégés

```ts
const users = useProtectedService('users')
const rows = await users.find({ query: { $limit: 10 } })
```

## Phase 3 — transport authifié officiel

- `useAuthBoundFetch()` pour les routes protégées
- `useAuthenticatedRequest()` repose sur `useAuthBoundFetch()`
- `useProtectedService()` retente une fois après `reAuthenticate()` sur 401
- les clients REST générés réutilisent la même source de bearer

## Phase 4 — outils protégés officiels

- `useProtectedTool(basePath)`
- `useMongoManagementClient()`

But : arrêter de reconstruire à la main les appels authentifiés pour Mongo admin, builder sécurisé, diagnostics, etc.

```ts
const mongo = useMongoManagementClient()
const databases = await mongo.getDatabases()
```

## Phase 5 — bridge Keycloak et diagnostics runtime

Phase 5 ajoute deux briques :

- `useKeycloakBridge()` pour synchroniser explicitement Keycloak -> FeathersJS
- des diagnostics enrichis dans `useAuthDiagnostics()` et `auth.getStateSnapshot()`

### `useKeycloakBridge()`

```ts
const bridge = useKeycloakBridge()
await bridge.ensureSynchronized('page-enter')
```

Ce helper :

- récupère le token Keycloak courant
- propage le token + l'utilisateur vers la bridge Feathers
- laisse `useAuthRuntime()` mettre à jour la source de vérité unifiée

### Diagnostics enrichis

Le snapshot expose maintenant aussi :

- `lastReadyAt`
- `lastAuthenticateAt`
- `lastReAuthenticateAt`
- `lastBridgeAt`
- `lastEnsureReason`
- `bridgePath`
- `clientSync`

Exemple :

```ts
const auth = useAuthRuntime()
console.log(auth.getStateSnapshot())
```


## Phase 6 — garde de page et trace auth officielle

Phase 6 ajoute deux briques de stabilisation utiles pour les outils protégés et les écrans complexes :

- `useProtectedPage()` pour attendre proprement `auth.ensureReady()` avant de lancer une page protégée
- `useAuthDiagnostics({ stableUntilMounted: true })` pour exposer un snapshot auth stable jusqu’au `mounted` client et éviter les mismatches SSR/client
- `useAuthTrace()` pour lire l’historique récent des événements auth du runtime

### `useProtectedPage()`

```ts
const page = useProtectedPage({
  auth: 'required',
  validateBearer: true,
  reason: 'mongo-page',
})

await page.ensure()
if (!page.authorized.value)
  return
```

### `useAuthTrace()`

```ts
const trace = useAuthTrace()
console.log(trace.value.latest)
console.log(trace.value.items)
```

Le runtime conserve maintenant un journal borné des événements auth (bootstrap, sync session, bridge Keycloak, reauth, garde de page).

### Cas normal : aucun token stocké

Quand une app démarre sans session existante, Feathers tente classiquement `reAuthenticate()` puis laisse l'UI afficher la page de login si aucun token n'est disponible. Depuis `6.4.125`, NFZ ne classe plus ce cas en `error` : le runtime reste en `anonymous` avec `tokenSource = 'none'`.

Autrement dit, sur `/auth-runtime` :

- `status = anonymous`
- `authenticated = false`
- `tokenSource = none`

signifient simplement « aucune session stockée », pas « authentification cassée ».

## Playground officiel

Le playground expose désormais deux surfaces utiles pour valider le runtime auth :

- `/auth-runtime` : état courant, diagnostics enrichis et trace récente des événements auth
- `/mongo` : exemple d'outil protégé utilisant `useProtectedPage()` + `useMongoManagementClient()`, avec auto-discovery des bases/collections et test REST direct des routes Mongo

## Règle pratique

Pour les outils protégés NFZ :

- ne pas reconstruire `Authorization` à la main
- ne pas lire le token depuis plusieurs endroits concurrents
- utiliser `useAuthRuntime()`, `useAuthenticatedRequest()`, `useProtectedService()`, `useProtectedTool()`
- en Keycloak SSO, utiliser `useKeycloakBridge()` si l’écran a besoin d’une synchronisation explicite avant un appel protégé

> En mode embedded, `useMongoManagementClient()` résout automatiquement le base path Mongo derrière le préfixe REST embedded. Les routes affichées dans le playground sont des endpoints REST à appeler via le client NFZ, pas des routes Vue Router.
