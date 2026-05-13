---
editLink: false
---
# Migrating an existing Nuxt 4 app to NFZ

This guide explains how to migrate an existing Nuxt 4 application to `nuxt-feathers-zod` progressively, without breaking the UI or the user experience.

## 1. Identify local stores

Before NFZ, many business apps start with:

```txt
Pinia + localStorage + local seeds
```

After NFZ, the target becomes:

```txt
Feathers service + MongoDB + Pinia UI cache
```

Pinia should stop being the business source of truth. It becomes a cache, UX facade or adapter to NFZ services.

## 2. Enable NFZ progressively

Start with:

```txt
NFZ_ENABLED=false
```

Enable NFZ when the `users` service and MongoDB are ready:

```txt
NFZ_ENABLED=true
```

## 3. Keep a temporary demo fallback

During migration:

```txt
AUTH_DEMO_FALLBACK=true
```

In production:

```txt
AUTH_DEMO_FALLBACK=false
```

## 4. Migrate authentication first

Always start with:

```bash
bunx nuxt-feathers-zod add service users --auth
```

Then verify the structure:

```txt
services/users/users.schema.ts
services/users/users.class.ts
services/users/users.ts
services/users/users.shared.ts
services/users/users.hooks.ts
```

The `users` service is the base for RBAC, admin access, member spaces, media authorization and protected services.

## 5. Migrate media

Create a service:

```bash
bunx nuxt-feathers-zod add service media-assets
```

Then connect MinIO/S3 or another stable storage backend.

Goal: avoid storing Data URLs in Markdown content in production.

## 6. Migrate editable content

Example services:

```txt
site-sections
theme-settings
news
documents
faq-items
pages
media-assets
```

Each service should have:

- a Zod schema;
- RBAC hooks;
- an external resolver;
- a Pinia store or client composable;
- an admin screen.

## 7. Migrate admin modules

Each admin page should go through:

```txt
business Pinia store
  -> useAdminFeathers()
    -> NFZ service
```

Avoid:

```txt
Vue page -> $fetch('/api/...') for business data
```

Prefer:

```txt
Vue page -> store/composable -> app.service('service-name')
```

## 8. Remove local fallback

When services are stable:

```txt
AUTH_DEMO_FALLBACK=false
```

Then verify:

- real login;
- page refresh;
- admin access;
- member access;
- logout;
- expired JWT;
- seeds disabled in production.

## 9. Recommended migration order

```txt
1. users --auth
2. studioSession / useNfzAuth
3. auth/admin/member middleware
4. media-assets
5. site-sections / home hero
6. theme-settings
7. news
8. activities
9. partners
10. forms
```

## 10. Important rule

Do not migrate the whole application in one pass.

Move service by service, while keeping existing stores as temporary facades.
