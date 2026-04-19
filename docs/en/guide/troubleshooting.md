---
editLink: false
---
# Troubleshooting

## 1) `Services typeExports []` / `Entity class User not found`

Most common cause:

- wrong `servicesDirs`,
- manually created service,
- auth enabled before generating `users`.

Recommended fix:

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

and verify:

```ts
feathers: {
  servicesDirs: ['services']
}
```

## 2) `Could not load .../src/module.ts`

This message may hide a real TypeScript error in an imported file.

Check first:

- generated templates,
- local `.ts` imports on Windows,
- broken template strings.

## 3) Swagger UI does not load the spec

Use `../swagger.json` from `/feathers/docs/`.

## 4) VitePress docs build breaks on frontmatter

Always close the YAML block before Markdown content.

## 5) Remote mode looks correct but nothing responds

Check:

- `client.remote.url`
- `transport`
- `restPath` / `websocketPath`
- services declared in `client.remote.services`
- in embedded browser mode, `transport: 'auto'` now prefers REST
- in remote mode, `transport: 'auto'` prefers Socket.IO when available, otherwise REST; use `transport: 'rest'` for a first-pass network/CORS diagnostic
- remote auth if enabled

## Useful commands

```bash
bunx nuxt-feathers-zod doctor
bun run build
bun run docs:dev
```

> Transport note (6.4.129): in generated clients, `transport: 'auto'` now resolves deterministically. Embedded browser mode prefers REST first; remote mode prefers Socket.IO when available, then falls back to REST.
