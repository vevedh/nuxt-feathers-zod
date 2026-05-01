---
editLink: false
---
# Middleware

This page replaces the former navigation-only placeholder with a practical developer reference for middleware, hook and policy generation targets. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

Middleware, hook and policy generation targets helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure middleware, hook and policy generation targets;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    server: { enabled: true },
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod add middleware admin-auth --target route --force
bunx nuxt-feathers-zod add middleware require-admin --target policy --force
```

## Runtime example

```ts
// app/middleware/admin-auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  await auth.ensureReady('admin-auth')

  if (!auth.isAuthenticated.value)
    return navigateTo('/login')
})
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.5.23 -->
