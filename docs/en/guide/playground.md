---
editLink: false
---
# Validation playground

The `playground/` directory is the repository validation application. It is not shipped in the npm tarball. It tests core module features against the built runtime.

## Run

```bash
bun install --frozen-lockfile
bun run dev
```

A standard playground build does not start memory MongoDB:

```bash
bun run playground:build
```

## Main workflow

| Route | Validation |
|---|---|
| `/` | Feathers client, NFZ runtime, service discovery, MongoDB |
| `/tests` | connection, services, authentication |
| `/validation` | embedded, remote, REST, Socket.IO, and SSO scenarios |

## Business features

| Route | Validation |
|---|---|
| `/messages` | protected Feathers CRUD |
| `/actions` | custom `actions.run()` method |
| `/mongo` | MongoDB Management client |
| `/builder` | discovery, Zod schemas, manifest, and Builder preview |

## Runtime and transports

| Route | Validation |
|---|---|
| `/auth-runtime` | authentication status, trace, and events |
| `/embedded` | embedded Feathers backend |
| `/remote/rest` | remote REST access |
| `/remote/socketio` | Socket.IO, real-time events, and reconnection |
| `/middleware` | module, plugin, service, and hook order |

## Advanced tools

| Route | Validation |
|---|---|
| `/ldapusers` | declared remote service |
| `/mongos` | direct Pinia/Feathers read |
| `/console/builder` | Feathers-first Builder console |
| `/console/rbac` | RBAC policy inspection and controlled editing |

## Builder console

The Builder console only uses `useBuilderClient()` and the `nfz/*` Feathers services:

```ts
const builder = useBuilderClient()
const discovery = await builder.getServices()
const schema = await builder.getSchema('users')
```

Discovery returns service objects with `name` and `source`. The console normalizes this shape before selecting a service.

When `feathers.console.allowWrite` is `false`, write actions are disabled while preview and diagnostics remain available.

## Coherence rule

Playground pages must not call the deprecated `/api/nfz/**` facades. Those Nitro routes are optional 6.x compatibility adapters. The playground validates the canonical Feathers `nfz/*` API.

<!-- release-version: 6.5.41 -->
