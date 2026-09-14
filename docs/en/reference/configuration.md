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

The recommended configuration uses named connections:

```ts
feathers: {
  database: {
    default: 'primary',
    connections: {
      primary: {
        type: 'mongodb',
        url: process.env.MONGODB_URL,
        database: 'application',
        management: {
          enabled: true,
          basePath: '/mongo/primary',
          auth: {
            enabled: true,
            authenticate: true,
          },
        },
      },
      reporting: {
        type: 'postgresql',
        connection: process.env.REPORTING_DATABASE_URL,
        pool: { min: 1, max: 10 },
      },
      localCache: {
        type: 'sqlite',
        connection: { filename: './data/cache.sqlite' },
        useNullAsDefault: true,
        required: false,
      },
    },
  },
}
```

Supported types are `mongodb`, `postgresql`, `mysql`, `mariadb`, and `sqlite`.

Starting with 6.7.41, every resolved connection also exposes non-sensitive `provider`, `databaseFamily`, `adapter`, `certification`, and `capabilities` metadata. Standard driver mapping is fail-closed: MongoDB uses the `mongodb` provider, while PostgreSQL/MySQL/MariaDB/SQLite use `knex`. MongoDB and PostgreSQL are certified; MySQL, MariaDB, and SQLite remain implemented until their dedicated real-engine gates are complete.

| Option | Default | Purpose |
|---|---:|---|
| `enabled` | `true` | enables the connection |
| `required` | `true` | blocks startup on failure |
| `healthCheck` | `true` | checks the connection after opening |
| `label` | — | non-sensitive diagnostic label |

MongoDB connections accept `url`, `database`, and `management`. SQL connections accept `connection`, `client`, `pool`, `acquireConnectionTimeout`, `useNullAsDefault`, and `searchPath`.

The legacy shape remains supported:

```ts
feathers: {
  database: {
    mongo: {
      url: process.env.MONGODB_URL,
    },
  },
}
```

It is mapped to a named `default` connection. Do not combine `database.mongo` with `database.connections.default`. Destructive MongoDB management operations remain disabled by default. See [Multi-database registry](/en/guide/multi-database).

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

<!-- release-version: 6.7.45 -->
