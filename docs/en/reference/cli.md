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
- `doctor`

## Reference examples

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

## Historical compatibility

`add custom-service <name>` is still accepted, but the recommended form is:

```bash
bunx nuxt-feathers-zod add service <name> --custom
```
