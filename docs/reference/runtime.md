# API client et composables

Le module auto-importe les composables de `src/runtime/composables` dans l’application Nuxt. Le client Feathers reste l’API principale pour les services.

## Client Feathers

### `useFeathers()`

Retourne les clients Feathers injectés dans Nuxt sous la forme `{ api, client, piniaClient }`. `api` est le client applicatif principal et `client` conserve l'accès au client de transport. `piniaClient` vaut `null` et reste présent uniquement pour ne pas casser un ancien destructuring.

```ts
const { api } = useFeathers()
const users = api.service('users')
```

Pour une page ou un composable métier, préférez `useService('users')` lorsque le chemin est connu.

### `useService(path)`

Retourne le service Feathers pour un chemin.

```ts
const users = useService('users')
const result = await users.find({ query: { $limit: 20 } })
```

### `useRawService(path)`

Accède au service sans couche applicative supplémentaire. À utiliser pour les méthodes et événements natifs Feathers.

```ts
const messages = useRawService('messages')
messages.on('created', handleCreated)
```

## Authentification

### `useAuth()`

API d’authentification orientée application.

### `useAuthRuntime()`

Runtime unifié de session. Il gère l’état, la disponibilité, la réauthentification et les providers Feathers ou Keycloak.

### `useAuthDiagnostics()`

Expose un état de diagnostic sans afficher les secrets.

### `useAuthTrace()`

Expose la trace récente des événements décrits dans [Événements et cycle de vie](/reference/events).

### `useAuthBoundFetch()`

Retourne une fonction de requête qui attend l’état auth, ajoute l’en-tête `Authorization` et peut retenter une requête après un `401`.

```ts
const request = useAuthBoundFetch({ auth: 'required' })
const profile = await request<Profile>('/internal/profile')
```

### `useAuthBoundFetchImplementation()`

Variante bas niveau de `useAuthBoundFetch()` qui retourne directement un `Response`. Elle est utile lorsqu’un appel doit inspecter le statut, les en-têtes ou un contenu non JSON.

### `useAuthenticatedRequest()`

Helper de requête authentifiée pour les intégrations qui utilisent l’abstraction de requête NFZ.

### `useProtectedPage()`

Contrôle l’accès d’une page et stabilise son état pendant le montage.

```ts
const page = useProtectedPage({
  auth: 'required',
  validateBearer: true,
  reason: 'admin-users',
})

await page.ensure()
```

### `useProtectedService()` et `useProtectedTool()`

Helpers d’accès protégé pour un service ou un outil interne.

## Builder et administration

### `useBuilderClient()`

Client typé par usage pour les services Feathers NFZ :

```ts
const builder = useBuilderClient()

await builder.getServices()
await builder.getSchema('users')
await builder.getManifest()
await builder.preview({ service: 'users', fields: {} })
await builder.getStatus()
await builder.getRbac()
await builder.getPresets()
```

Les appels passent par `client.service('nfz/...')`.

### `useMongoManagementClient()`

Client des services MongoDB Management configurés dans `database.mongo.management`.

### `useNfzAdminClient()`

Client des diagnostics et fonctions d’administration NFZ exposés par la configuration publique.

### `useKeycloakBridge()`

Client du bridge Keycloak lorsque `keycloak.mode` vaut `bridge`.

## Pinia

### `useNfzPinia()`

Retourne l’instance Pinia enregistrée par `@pinia/nuxt` et un indicateur `available`.

### `hasNfzPinia()`

Retourne un booléen indiquant si Pinia est disponible.

Le module ne réintroduit pas un wrapper de service-store historique. Pinia est destiné aux stores applicatifs et de session explicites.

## Règle de conception

Pour une opération métier :

1. appelez un service Feathers avec `useService()` ou `useRawService()` ;
2. utilisez `useBuilderClient()` pour les services NFZ de Builder/RBAC ;
3. utilisez les helpers de requête HTTP uniquement lorsque le contrat cible n’est pas un service Feathers.

<!-- release-version: 6.5.49 -->
