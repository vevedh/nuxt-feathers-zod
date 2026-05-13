# Événements et hooks

Cette page décrit les événements runtime et les hooks Feathers utiles pour diagnostiquer une application `nuxt-feathers-zod`.

## Événements d'authentification

`useAuthRuntime()` expose un historique d'événements de session. Les types actuellement utilisés couvrent :

| Événement | Signification |
|---|---|
| `ensure-start` | Début de vérification de session. |
| `ensure-finish` | Fin de vérification de session. |
| `session-sync` | Synchronisation générale de session. |
| `sso-session-sync` | Synchronisation d'une session SSO. |
| `feathers-session-sync` | Synchronisation d'une session Feathers. |
| `authenticate` | Authentification explicite. |
| `reauth-skipped` | Restauration ignorée. |
| `reauth-success` | Restauration réussie. |
| `reauth-failure` | Restauration échouée. |
| `logout` | Déconnexion. |
| `keycloak-client-session` | Session Keycloak détectée côté client. |
| `keycloak-bridge-success` | Bridge Keycloak vers Feathers réussi. |
| `keycloak-bridge-fallback` | Fallback du bridge Keycloak. |
| `keycloak-bearer-validated` | Bearer token validé. |
| `keycloak-bearer-missing` | Bearer token absent. |
| `protected-page-ready` | Page protégée autorisée. |
| `protected-page-blocked` | Page protégée bloquée. |

## Lecture des événements

```ts
const auth = useAuthRuntime()
const snapshot = auth.getStateSnapshot()

console.log(snapshot.events)
```

## Nettoyage diagnostic

```ts
const auth = useAuthRuntime()
auth.clearEvents()
auth.resetDiagnostics()
```

## Hooks Feathers

Les hooks Feathers restent le meilleur point d'entrée pour tracer les appels métier.

```ts
export const traceHook = async (context, next) => {
  const startedAt = Date.now()

  try {
    await next()
    console.info('service:success', {
      path: context.path,
      method: context.method,
      duration: Date.now() - startedAt,
    })
  }
  catch (error) {
    console.error('service:error', {
      path: context.path,
      method: context.method,
      duration: Date.now() - startedAt,
      error,
    })
    throw error
  }
}
```

## Recommandation

Pour une application métier, combiner :

- les événements `useAuthRuntime()` pour la session ;
- les hooks `around`, `before`, `after`, `error` pour les services ;
- les logs serveur pour l'infrastructure ;
- les stores ou composables métier pour l'UX.
