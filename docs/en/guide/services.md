---
editLink: false
---
# Services (Zod-first)

A Feathers service is an object/class that implements standard service methods (CRUD). `nuxt-feathers-zod` scans your services directory and wires both server and client automatically.

## Recommended structure

```
services/<name>/
  <name>.ts          # server registration (app.use/app.configure)
  <name>.class.ts    # service implementation
  <name>.schema.ts   # Zod schemas + validators/resolvers
  <name>.shared.ts   # client registration + typings
```

## Manual services vs CLI

You *can* create services manually, but for the **first** service it is strongly recommended to use:

```bash
bunx nuxt-feathers-zod add service users
```

This avoids missing type exports and registration mismatches that can lead to errors like:

- `Services typeExports []`
- `Entity class ... not found`

## Service discovery

- **Server**: the module registers services from your `servicesDirs` using the service entry file (`<name>.ts`)
- **Client**: the module registers client services from `<name>.shared.ts`
