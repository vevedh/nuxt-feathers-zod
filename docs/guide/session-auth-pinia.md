---
editLink: false
---
# Auth session avec Pinia

Depuis la 6.5.21 et confirmé en 6.5.23, le runtime standard utilise un client Feathers natif pour `$api` / `$client`. Pinia sert uniquement à porter la session applicative.

## Règle officielle

```ts
const session = useSessionStore()
await session.login({ strategy: 'local', userId, password })
```

Ne pas utiliser `feathers-pinia` comme runtime client standard. Les mappings Feathers-Pinia restent optionnels et séparés.

<!-- release-version: 6.5.23 -->
