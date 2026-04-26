---
editLink: false
---
# Services (Zod-first)

The recommended path remains:

1. initialize the module,
2. generate services with the CLI,
3. then refine the generated files.

## Example: new Nuxt 4 app + first service

```bash
bunx nuxi@latest init my-nfz-services
cd my-nfz-services
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --idField _id --docs
bun dev
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

## Expected structure

```txt
services/<name>/
  <name>.ts
  <name>.class.ts
  <name>.schema.ts
  <name>.shared.ts
```

## File roles

- `<name>.ts`: service registration
- `<name>.class.ts`: service implementation
- `<name>.schema.ts`: Zod schemas / validators / resolvers when enabled
- `<name>.shared.ts`: client contract + types + shared behavior

## Supported adapters

### Memory

Default adapter, useful for:

- demos,
- smoke tests,
- fast start.

```bash
bunx nuxt-feathers-zod add service messages
```

### MongoDB

Use it when an embedded `mongodbClient` is configured.

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

## Schemas

By default, the generator currently aims for a simple start.

```bash
bunx nuxt-feathers-zod add service messages --schema none
```

Enable schemas explicitly:

```bash
bunx nuxt-feathers-zod add service messages --schema zod
bunx nuxt-feathers-zod add service messages --schema json
```

## Auth on a service

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

In practice, `users` remains the reference service for embedded auth.

## REST endpoints

With `rest.path = '/feathers'`:

- `GET /feathers/articles`
- `GET /feathers/articles/:id`
- `POST /feathers/articles`
- `PATCH /feathers/articles/:id`
- `DELETE /feathers/articles/:id`

## Best practices

- keep `servicesDirs: ['services']`
- do not move services outside a scanned directory
- generate through the CLI, then customize
- do not break `*.shared.ts` unless you understand its client-side role
