---
editLink: false
---
# Frontend usage

On the Nuxt side you use the injected Feathers client.

```ts
const api = useNuxtApp().$api
const users = await api.service('users').find()
```

## Auth usage

Depending on your project setup you may use:

- a Pinia auth store
- a composable like `useAuth()`
- Keycloak-only SSO flow

Keep auth initialization **SSR-safe** (avoid browser-only APIs during SSR).
