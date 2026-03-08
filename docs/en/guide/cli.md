---
editLink: false
---
# CLI

The `bunx nuxt-feathers-zod` CLI is the **official method** to initialize a Nuxt 4 app and generate module-compatible artifacts.

It avoids most common drift:

- incomplete `nuxt.config.ts`,
- inconsistent `servicesDirs`,
- auth enabled without a `users` service,
- hand-written services not scanned by the module,
- client runtime and public runtime config out of sync.

## Entry command

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Recommended flow: new Nuxt 4 app

### Embedded

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### Embedded + local auth

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id --docs
bun dev
```

### Remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Available commands

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service`
- `add remote-service`
- `add middleware`
- `doctor`

## Important DX rules

- default adapter = `memory`
- default schema = `none`
- recommended `servicesDirs` = `['services']`
- in embedded mode, generate services through the CLI
- `add custom-service` is still supported, but the public recommended form is:

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

## `init templates`

Initializes a templates override directory.

```bash
bunx nuxt-feathers-zod init templates
```

Useful flags:

- `--dir <dir>`
- `--force`
- `--dry`

Example for a new Nuxt 4 app:

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
```

## `init embedded`

Initializes **embedded** mode: Feathers server inside Nitro.

```bash
bunx nuxt-feathers-zod init embedded --force
```

Important flags:

- `--framework express|koa`
- `--servicesDir <dir>`
- `--restPath <path>`
- `--websocketPath <path>`
- `--auth true|false`
- `--swagger true|false`
- `--secureDefaults true|false`
- `--cors true|false`
- `--compression true|false`
- `--helmet true|false`
- `--bodyParserJson true|false`
- `--bodyParserUrlencoded true|false`
- `--serveStatic true|false`
- `--serveStaticPath <path>`
- `--serveStaticDir <dir>`
- `--serverModulesPreset <name>`
- `--expressBaseline`
- `--force`
- `--dry`

### Koa example

```bash
bunx nuxt-feathers-zod init embedded --framework koa --force
```

### Express + auth + Swagger example

```bash
bunx nuxt-feathers-zod init embedded --framework express --auth --swagger --force
```

### Express baseline example

```bash
bunx nuxt-feathers-zod init embedded --framework express --expressBaseline --force
```

## `init remote`

Initializes **remote** mode: Feathers client to an external server.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
```

Important flags:

- `--url <http(s)://...>`
- `--transport socketio|rest`
- `--restPath <path>`
- `--websocketPath <path>`
- `--auth true|false`
- `--payloadMode jwt|keycloak`
- `--strategy <name>`
- `--tokenField <name>`
- `--servicePath <path>`
- `--reauth true|false`
- `--force`
- `--dry`

### REST example

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --restPath /api/v1 --force
```

### Remote + Keycloak payload example

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## `remote auth keycloak`

Configures the Keycloak bridge in the app.

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId myapp
```

## `add service <name>`

Generates an embedded service.

```bash
bunx nuxt-feathers-zod add service users
```

Useful flags:

- `--adapter memory|mongodb`
- `--schema none|zod|json`
- `--auth true|false`
- `--idField id|_id`
- `--path <servicePath>`
- `--collection <name>`
- `--docs true|false`
- `--servicesDir <dir>`
- `--force`
- `--dry`

### MongoDB + docs example

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --idField _id --docs
```

## `add service <name> --custom`

Generates an **adapter-less** service with custom methods.

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

This is the recommended form for:

- jobs,
- business actions,
- orchestration operations,
- controlled endpoints.

## `add remote-service <name>`

Adds a client-only service into `feathers.client.remote.services`.

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

## `add middleware <name>`

Generates a middleware artifact.

```bash
bunx nuxt-feathers-zod add middleware auth --target client
```

Supported targets:

- `nitro`
- `feathers`
- `server-module`
- `module`

## `doctor`

Quick diagnosis for the current project.

```bash
bunx nuxt-feathers-zod doctor
```

Use it when:

- services are not detected,
- embedded auth does not resolve `users`,
- remote mode looks misconfigured,
- the module compiles but runtime behavior is off.
