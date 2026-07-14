# Technical reference

`nuxt-feathers-zod` provides a Nuxt 4 foundation for running Feathers inside Nitro or connecting Nuxt to a remote Feathers API. The API model is **Feathers-first**.

## Implemented capabilities

| Area | Capabilities |
|---|---|
| Modes | `embedded`, `remote` |
| Transports | REST, Socket.IO |
| Embedded REST server | Express or Koa |
| Services | adapter, custom, file, remote |
| Generated adapters | memory, MongoDB |
| Schemas | none, Zod, JSON |
| Authentication | local/JWT, remote, Keycloak |
| NFZ tools | services, schemas, manifest, builder, status, RBAC, presets, init |
| Client | Nuxt composables and Feathers client |
| Operations | CLI, doctor, diagnostics, DevTools, MongoDB Management |

Inspect the installed version:

```bash
bunx nuxt-feathers-zod capabilities --section all --json
```

## Reference map

- [Architecture](/en/reference/architecture)
- [Module process](/en/reference/module)
- [Configuration](/en/reference/configuration)
- [Services](/en/reference/services)
- [Client API and composables](/en/reference/runtime)
- [Events and lifecycle](/en/reference/events)
- [CLI reference](/en/reference/cli)

Legacy `/api/nfz/**` routes are optional 6.x compatibility facades. The canonical contracts are Feathers services.

<!-- release-version: 6.5.41 -->
