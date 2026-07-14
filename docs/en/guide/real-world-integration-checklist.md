---
editLink: false
---
# Real-world NFZ integration checklist

Use this checklist before considering a Nuxt 4 + Quasar + Pinia + NFZ application production-ready.

## Configuration

- [ ] `nuxt-feathers-zod` installed.
- [ ] `@pinia/nuxt` installed.
- [ ] `nuxt-quasar-ui` installed when using Quasar.
- [ ] `@unocss/nuxt` installed when using UnoCSS.
- [ ] `database.mongo.url` configured.
- [ ] `auth.authStrategies` configured.
- [ ] `entityClass: 'User'` aligned with `users.schema.ts`.
- [ ] `feathers.servicesDirs = ['services']` unless there is a documented reason to change it.

## Users service

- [ ] `services/users/users.schema.ts` exists.
- [ ] Runtime class `User` is exported.
- [ ] `passwordHash({ strategy: 'local' })` is in the resolver.
- [ ] `password` is hidden in the external resolver.
- [ ] External `users.create` is protected.
- [ ] `users.get` is limited to self/admin.
- [ ] Seeds create users through `app.service('users').create()`.

## UI auth

- [ ] `useNfzAuth()` centralizes login/logout/reAuthenticate.
- [ ] The JWT is stored consistently.
- [ ] `studioSession` or an equivalent store is a UI cache only.
- [ ] `auth`, `admin-auth` and `member-auth` middleware exist.
- [ ] Demo fallback is disabled in production.

## Quasar

- [ ] `nuxt-quasar-ui` is used.
- [ ] No manual Quasar plugin duplicates the module.
- [ ] `AppFullscreen` is used when fullscreen support is needed.
- [ ] Viewport-dependent components are SSR-safe or client-only.

## Pinia and hydration

- [ ] LocalStorage-dependent stores hydrate after mount or through a safe client plugin.
- [ ] SSR output does not depend on client-only session values.
- [ ] Admin stats use stable placeholders before client hydration.

## Business services

- [ ] Each business service has a schema, hooks and external resolver.
- [ ] Sensitive writes are protected server-side.
- [ ] Pages do not call `$api.service(...)` directly everywhere.
- [ ] A composable or store acts as a business facade.

## Production

- [ ] `NFZ_ENABLED=true`.
- [ ] Demo fallback disabled.
- [ ] Seeds disabled or controlled.
- [ ] Persistent MongoDB configured.
- [ ] Secrets stored in `.env` or deployment secrets only.
- [ ] Admin-only pages protected by middleware and server hooks.
