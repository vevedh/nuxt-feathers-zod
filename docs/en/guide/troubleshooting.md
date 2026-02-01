---
editLink: false
---
# Troubleshooting

## `Services typeExports []` / `Entity class ... not found`

Most of the time the module was not initialized according to the documentation.

Fix:

1) Ensure `feathers.servicesDirs = ['services']` is present in `nuxt.config.ts`
2) Remove any manually created first service that does not match the module structure
3) Generate the first service with:

```bash
bunx nuxt-feathers-zod add service users
```

Restart Nuxt.

## Type-check issues in playground

If you hit `vite-plugin-checker` cache issues (ENOTEMPTY/ENOENT), clean `node_modules/vite-plugin-checker` and caches, or disable type checking in the playground temporarily.

## Windows ESM path issue (module dev)

When developing the module on Windows, use explicit `.ts` extensions in `nuxt.config.ts` when pointing to local module sources to avoid “Could not load .../src/module”.
