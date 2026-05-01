---
editLink: false
---
# Remote Keycloak app

This page replaces the former navigation-only placeholder with a practical developer reference for Keycloak-based remote authentication. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

Keycloak-based remote authentication helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure Keycloak-based remote authentication;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
        },
        services: [
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
    },
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'internal',
      clientId: 'nuxt-app',
      onLoad: 'check-sso',
      authServicePath: '/_keycloak',
    },
    server: { enabled: false },
    auth: false,
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm internal --clientId nuxt-app
```

## Runtime example

```ts
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.5.23 -->
