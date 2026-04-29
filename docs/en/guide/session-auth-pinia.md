---
editLink: false
---
# Session auth with Pinia

Since 6.5.21 and confirmed in 6.5.23, the standard runtime uses a native Feathers client for `$api` / `$client`. Pinia only carries the application session.

## Official rule

```ts
const session = useSessionStore()
await session.login({ strategy: 'local', userId, password })
```

Do not use `feathers-pinia` as the standard client runtime. Feathers-Pinia mappings remain optional and separate.

<!-- release-version: 6.5.23 -->
