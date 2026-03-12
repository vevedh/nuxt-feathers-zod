---
editLink: false
---
# CLI reference

Entry command:

```bash
bunx nuxt-feathers-zod
```

## Commands supported in the open source core

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `add middleware <name>`
- `add server-module <name>`
- `add mongodb-compose`
- `auth service <name>`
- `doctor`

## Reference examples

### Minimum check

```bash
bunx nuxt-feathers-zod --help
```

### New embedded app

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

### New remote app

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

### Local MongoDB bootstrap

```bash
bunx nuxt-feathers-zod add mongodb-compose
```

### Toggle auth hooks on a service

```bash
bunx nuxt-feathers-zod auth service users --enabled true
```

## Historical compatibility

`add custom-service <name>` is still accepted, but the recommended form is:

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

## `users` auth-aware generation

`add service users --auth` now supports an explicit `--authAware true|false` flag.

Expected behavior:

- `--auth` = JWT protection on the service
- `--authAware` = password hashing/masking semantics for local auth
- default for `users --auth` = auth-aware enabled unless explicitly disabled

Reference examples:

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```
