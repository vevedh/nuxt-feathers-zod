# Événements et cycle de vie

## Cycle de vie du serveur embedded

Le runtime suit les phases suivantes :

1. `infrastructure` ;
2. `modules:pre` ;
3. `plugins` ;
4. `services` ;
5. `modules:post` ;
6. `app.setup` ;
7. `routers` ;
8. `ready` ;
9. `teardown`.

Le statut `ready` n’est publié qu’après les routeurs REST et Socket.IO.

## Événements Feathers

Les services conservent le modèle événementiel Feathers. Les événements standards dépendent des méthodes exposées, par exemple :

```ts
const messages = useRawService('messages')

messages.on('created', (message) => {
  console.info('Nouveau message', message)
})

messages.on('patched', (message) => {
  console.info('Message modifié', message)
})
```

Les méthodes personnalisées et leurs événements doivent être déclarés explicitement par le service.

## Trace du runtime d’authentification

`useAuthRuntime()` et `useAuthTrace()` utilisent les types d’événements suivants :

| Événement | Signification |
|---|---|
| `ensure-start` | début d’une vérification de session |
| `ensure-finish` | fin d’une vérification de session |
| `session-sync` | synchronisation générale de session |
| `sso-session-sync` | synchronisation d’une session SSO |
| `feathers-session-sync` | synchronisation de la session Feathers |
| `authenticate` | authentification demandée |
| `reauth-skipped` | réauthentification non nécessaire |
| `reauth-success` | réauthentification réussie |
| `reauth-failure` | réauthentification en échec |
| `logout` | fermeture de session |
| `keycloak-client-session` | session détectée côté client Keycloak |
| `keycloak-bridge-success` | échange avec le bridge Keycloak réussi |
| `keycloak-bridge-fallback` | chemin de repli du bridge utilisé |
| `keycloak-bearer-validated` | bearer Keycloak validé |
| `keycloak-bearer-missing` | bearer attendu mais absent |
| `protected-page-ready` | page protégée autorisée |
| `protected-page-blocked` | page protégée bloquée |

Ces valeurs sont exportées par `NFZ_AUTH_EVENT_TYPES` depuis `nuxt-feathers-zod/capabilities`.

## Diagnostic

```ts
const trace = useAuthTrace()
const diagnostics = useAuthDiagnostics()
```

Le playground `/auth-runtime` permet de contrôler la séquence récente sans afficher les secrets ou le token complet.

<!-- release-version: 6.6.0 -->
