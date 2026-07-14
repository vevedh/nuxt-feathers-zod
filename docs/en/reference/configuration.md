# Configuration

Module configuration lives under the `feathers` key in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Top-level options

The keys below match `ModuleOptions` in the module source.

| Option | Purpose |
|---|---|
| `transports` | REST and Socket.IO |
| `database` | MongoDB and MongoDB Management |
| `servicesDirs` | service discovery directories |
| `server` | embedded server, modules, and security |
| `auth` | local/JWT authentication |
| `keycloak` | Keycloak client and server bridge |
| `client` | `embedded` or `remote` client mode |
| `validator` | validator formats |
| `loadFeathersConfig` | legacy Feathers configuration loading |
| `swagger` | legacy Swagger integration |
| `templates` | custom templates and allow-list |
| `devtools` | NFZ DevTools integration |
| `console` | NFZ Builder/RBAC services and compatibility facades |

## `client`

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: 'https://api.example.test',
      transport: 'socketio',
      restPath: '/feathers',
      websocketPath: '/socket.io',
      auth: {
        enabled: true,
        servicePath: 'authentication',
        payloadMode: 'jwt',
        strategy: 'jwt',
        tokenField: 'accessToken',
        reauth: true,
      },
      services: [
        { path: 'users' },
        { path: 'articles', methods: ['find', 'get'] },
      ],
    },
  },
}
```

## `transports`

```ts
feathers: {
  transports: {
    rest: { path: '/feathers', framework: 'express' },
    websocket: {
      path: '/socket.io',
      connectTimeout: 45_000,
      transports: ['websocket'],
      cors: {
        origin: 'https://app.example.test',
        credentials: true,
        methods: ['GET', 'POST'],
      },
    },
  },
}
```

## `server`

`server` controls the embedded runtime, module directories, module order, secure defaults, CORS, compression, Helmet, body parsing, and optional static serving.

Default lifecycle order is `modules:pre`, `plugins`, `services`, `modules:post`.

## `database`

```ts
feathers: {
  database: {
    mongo: {
      url: process.env.MONGODB_URL,
      management: {
        enabled: true,
        basePath: '/mongo',
        auth: { enabled: true, authenticate: true },
        showSystemDatabases: false,
        allowCreateCollection: false,
        allowDropCollection: false,
        allowInsertDocuments: false,
        allowPatchDocuments: false,
        allowReplaceDocuments: false,
        allowRemoveDocuments: false,
      },
    },
  },
}
```

Destructive management operations are disabled by default.

## `auth`

`auth` configures the user service, entity, strategies, local fields, and client authentication path. Configure `auth.local.usernameField` to change the login field; there is no `--localUsernameField` CLI flag.

## `keycloak`

Key options are `serverUrl`, `realm`, `clientId`, `onLoad`, `mode`, `secret`, `issuer`, `audience`, `userService`, `serviceIdField`, `authServicePath`, `permissions`, `userProvisioning`, and `failOpen`.

Secrets remain private at server runtime. Fail-closed behavior is recommended.

## `validator`

`validator.formats` selects supported formats and `validator.extendDefaults` controls whether default formats are extended.

## `templates`

`templates.dirs`, `templates.strict`, and `templates.allow` control template overrides. Strict mode and the allow-list limit generated write targets.

## `console`

```ts
feathers: {
  console: {
    enabled: true,
    basePath: '/console',
    allowWrite: false,
    servicesDirs: ['services'],
    legacyNitroRoutes: false,
  },
}
```

`console.enabled` registers the Feathers `nfz/*` services. The module does not inject Vue console pages into consuming applications. `basePath` remains public metadata for tools that mount their own UI.

## RuntimeConfig

Private values live under `runtimeConfig._feathers`. Client-safe values live under `runtimeConfig.public._feathers`. Never copy a credentialed MongoDB URL or Keycloak secret to public runtime configuration.

<!-- release-version: 6.5.47 -->
