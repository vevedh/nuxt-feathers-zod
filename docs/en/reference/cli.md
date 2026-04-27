---
editLink: false
---
# CLI reference

Entry command:

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

Official OSS surface aligned with **v6.5.9**.

## Recommended public core

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add file-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

## Secondary commands / compatibility

- `add custom-service <name>`
- `init templates`
- `templates list`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`


## Doctor in 6.5.9

Doctor now highlights embedded local-auth configuration, including:

- `auth.enabled`
- `auth.authStrategies`
- `auth.local.usernameField` / `auth.local.passwordField`
- `auth.local.entityUsernameField` / `auth.local.entityPasswordField`
- a Feathers local payload example
- an explicit warning when request ↔ entity mapping diverges

## Reference examples

### Minimum check

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod doctor
```

### New embedded app

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### New remote app

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

### Services and schema maintenance

```bash
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --diff
bunx nuxt-feathers-zod schema users --repair-auth
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

### Runtime / Mongo

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

## Stability notes

### `schema <service>` flags worth knowing

- `--validate`: checks manifest ↔ generated-files coherence
- `--repair-auth`: restores the auth-compatible baseline for a `users` service
- `--diff`: inspects drift before writes

### `add middleware <name>` target reading

- recommended public targets: `nitro`, `route`
- advanced targets: `feathers`, `server-module`, `module`, `client-module`, `hook`, `policy`

### Historical compatibility

`add custom-service <name>` is still accepted, but the recommended form is:

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

Detailed flag coverage stays in the [CLI guide](/en/guide/cli).


<!-- release-version: 6.4.48 -->


<!-- release-version: 6.4.49 -->


<!-- release-version: 6.5.9 -->


<!-- release-version: 6.5.9 -->


<!-- release-version: 6.4.125 -->


<!-- release-version: 6.5.9 -->


<!-- release-version: 6.5.9 -->


<!-- release-version: 6.5.16 -->


<!-- release-version: 6.5.18 -->


<!-- release-version: 6.5.19 -->


<!-- release-version: 6.5.20 -->
