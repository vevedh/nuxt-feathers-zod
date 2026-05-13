# CLI

The `nuxt-feathers-zod` CLI initializes projects, generates services and checks configuration consistency.

```bash
bunx nuxt-feathers-zod --help
```

## Main commands

| Command | Purpose |
|---|---|
| `doctor` | Checks Nuxt configuration, services, manifest and common options. |
| `init embedded` | Configures an application with an embedded Feathers backend. |
| `init remote` | Configures a client application connected to an external Feathers API. |
| `init starter` | Prepares an application base from a preset. |
| `init templates` | Installs service templates. |
| `add service` | Generates a standard Feathers service. |
| `add file-service` | Generates an upload/download service. |
| `add remote-service` | Declares a service consumed from a remote API. |
| `add custom-service` | Generates an adapter-less service with custom methods. |
| `add middleware` | Generates application middleware. |
| `add server-module` | Generates an embedded server module. |
| `mongo management` | Adds MongoDB administration support. |
| `schema` | Inspects or edits a service schema. |
| `auth service` | Adds an authentication-related service. |
| `templates`, `plugins`, `modules`, `middlewares` | Lists or adds entries from module registries. |

## Diagnostic

```bash
bunx nuxt-feathers-zod doctor
```

Run it after installation, after service generation and before delivery.

## Initialize embedded mode

```bash
bunx nuxt-feathers-zod init embedded \
  --auth \
  --database mongodb \
  --framework express \
  --servicesDir services \
  --restPath /feathers \
  --websocketPath /socket.io
```

Useful options:

- `--auth` enables the authentication base;
- `--database mongodb` prepares MongoDB integration;
- `--framework express|koa` chooses the embedded server framework;
- `--swagger` enables Swagger documentation when available;
- `--secureDefaults` applies conservative server options.

## Initialize remote mode

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth \
  --payloadMode jwt
```

Useful options:

- `--url` is required;
- `--transport socketio|rest` defines the client transport;
- `--payloadMode jwt|keycloak` adapts the authentication payload;
- `--tokenField accessToken|access_token` defines the expected token field.

## Generate a service

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

Useful options:

- `--adapter memory|mongodb|custom`;
- `--schema none|zod|json`;
- `--auth` for an authentication-compatible user service;
- `--collection <name>` for MongoDB;
- `--idField <field>` to define the identifier field.

## Service with custom methods

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find,run --customMethods run
```

Custom methods should be declared explicitly to keep the client, server and types aligned.

## Remote service

```bash
bunx nuxt-feathers-zod add remote-service api/ldap-search --methods find
```

This mode is suited for services exposed by an external backend and consumed from the Nuxt application.

## Schemas

```bash
bunx nuxt-feathers-zod schema articles --show
bunx nuxt-feathers-zod schema articles --add-field title:string:required
bunx nuxt-feathers-zod schema articles --validate
```

The `schema` command helps inspect and maintain schemas without breaking the runtime contract.

## Important rule

For business services, prefer:

```bash
bunx nuxt-feathers-zod add service <name>
```

Manual folder creation can prevent the scanner from finding the expected exports.


<!-- release-version: 6.5.31 -->
