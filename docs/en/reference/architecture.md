# Architecture

## Goal

The module reduces duplication between a Nuxt application and its Feathers backend. In embedded mode, Feathers runs in Nitro. In remote mode, Nuxt keeps the same client model and connects to an external backend.

## Responsibilities

### Nuxt

Vue UI, SSR, client plugins, composables, and application configuration.

### Nitro and H3

Nuxt server hosting, lifecycle, infrastructure middleware, HTTP-specific integration, and `@vevedh/feathers-nitro` wiring.

### Feathers

Business services, standard and custom methods, hooks, authentication, authorization, events, REST, and Socket.IO.

### Zod

Data validation and schema description when `schema: zod` is selected.

## Feathers-first API

```ts
const result = await app.service('articles').find({
  query: { $limit: 20 },
})
```

The Nuxt client uses the same service path through `useService('articles')`. NFZ Builder features follow the same rule through `nfz/*` services.

## Runtime instance

The 6.5.x line maintains a typed `default` runtime instance with `initializing`, `ready`, `failed`, `closing`, and `closed` states. Bridges wait for the readiness promise.

## Runtime secrets

MongoDB and Keycloak secrets are resolved at runtime and are not serialized into generated templates or public runtime configuration.

## Legacy Nitro compatibility

`console.legacyNitroRoutes: true` keeps deprecated `/api/nfz/**` facades. New applications should use `false` and consume Feathers `nfz/*` services.

<!-- release-version: 6.6.0 -->
