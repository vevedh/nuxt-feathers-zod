# Services

## Application services

Application services live in `servicesDirs` and should be generated through the CLI when possible:

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod
```

Standard and custom Feathers methods are declared separately.

## NFZ console services

When `console.enabled` is active, eight Feathers services are registered before `app.setup()`.

| Service | Methods | Purpose |
|---|---|---|
| `nfz/services` | `find` | service discovery |
| `nfz/schemas` | `find`, `get`, `patch` | schema inspection and synchronization |
| `nfz/manifest` | `get`, `patch` | current NFZ manifest |
| `nfz/builder` | `create` | Builder preview and apply |
| `nfz/status` | `find` | console, authentication, and RBAC status |
| `nfz/rbac` | `get`, `patch` | RBAC policy |
| `nfz/presets` | `find`, `create` | preset list, preview, and apply |
| `nfz/init` | `create` | guided initialization operations |

## Discovery

`nfz/services.find()` returns a payload containing `projectRoot`, `servicesDirs`, and service objects with `name` and `source`. The Builder console normalizes this real shape before selecting a service.

## Builder client

```ts
const builder = useBuilderClient()
const discovery = await builder.getServices()
const schema = await builder.getSchema('users')
const preview = await builder.preview({
  service: 'users',
  fields: schema.fields,
})
```

Dangerous property names such as `__proto__`, `prototype`, and `constructor` are rejected in Builder inputs. Payload depth, node count, and field count are bounded.

## RBAC and writes

`nfz/rbac.patch()` and Builder apply operations are rejected when `console.allowWrite` is `false`.

## 6.x compatibility

Deprecated `/api/nfz/**` routes are thin adapters to these Feathers services. They are not independent business APIs.

<!-- release-version: 6.5.41 -->
