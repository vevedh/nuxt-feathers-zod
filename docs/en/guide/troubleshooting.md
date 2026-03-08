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
- remote auth if enabled

## Useful commands

```bash
bunx nuxt-feathers-zod doctor
bun run build
bun run docs:dev
```
