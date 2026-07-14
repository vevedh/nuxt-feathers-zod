# Référence technique

`nuxt-feathers-zod` fournit un socle Nuxt 4 pour exécuter Feathers dans Nitro ou connecter Nuxt à une API Feathers distante. Le modèle d’API est **Feathers-first**.

## Capacités implémentées

| Domaine | Capacités |
|---|---|
| Modes | `embedded`, `remote` |
| Transports | REST, Socket.IO |
| Serveur REST embedded | Express ou Koa |
| Services | adapter, custom, file, remote |
| Adapters générés | memory, MongoDB |
| Schémas | none, Zod, JSON |
| Auth | locale/JWT, remote, Keycloak |
| Outils NFZ | services, schemas, manifest, builder, status, RBAC, presets, init |
| Client | composables Nuxt et client Feathers |
| Exploitation | CLI, doctor, diagnostics, DevTools, MongoDB Management |

La matrice de la version installée est consultable sans lire le code :

```bash
bunx nuxt-feathers-zod capabilities --section all --json
```

## Référence par sujet

- [Architecture](/reference/architecture)
- [Processus du module](/reference/module)
- [Configuration](/reference/configuration)
- [Services](/reference/services)
- [API client et composables](/reference/runtime)
- [Événements et cycle de vie](/reference/events)
- [Référence CLI](/reference/cli)

## Principe d’architecture

```text
Nuxt 4
  ├─ Vue / SSR / plugins / composables
  └─ Nitro
       ├─ hébergement du runtime
       ├─ middleware et infrastructure H3
       └─ @vevedh/feathers-nitro
            └─ Feathers
                 ├─ services et méthodes
                 ├─ hooks et authentification
                 ├─ événements
                 └─ adapters
                      └─ Zod / MongoDB / memory
```

Les routes Nitro métier ne sont pas le contrat principal du module. Les anciennes routes `/api/nfz/**` sont des façades de compatibilité désactivables avec `console.legacyNitroRoutes: false`.

<!-- release-version: 6.5.47 -->
