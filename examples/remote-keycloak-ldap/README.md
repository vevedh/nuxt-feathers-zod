# Remote Keycloak + LDAP bridge example

This example documents the recommended contract for a Nuxt 4 remote client using NFZ and a remote Feathers backend implementing a `keycloak-ldap` authentication strategy.

## Client-side NFZ configuration

See `nuxt.config.remote-keycloak-ldap.ts`.

NFZ keeps Keycloak client-only. It exposes `ssoUser` / `ssoToken`, then the application explicitly asks the backend to create the Feathers session:

```ts
const auth = useAuth()

await auth.ensureReady('remote-keycloak-ldap')

const result = await auth.bridgeSso({
  servicePath: 'authentication',
  strategy: 'keycloak-ldap',
  tokenField: 'access_token',
})

console.log(auth.ssoUser.value)      // Keycloak tokenParsed
console.log(auth.feathersUser.value) // LDAP/Feathers enriched user
console.log(result.user)
```

Do not configure `remote.auth.payloadMode = 'keycloak'` for automatic authentication. That older pattern makes the Keycloak callback, CORS and backend bridge too coupled.

## Backend-side Feathers strategy

See:

```txt
src/authentication/strategies/sso-ldap.strategy.ts
src/authentication.ts
config/default.ts
.env.example
```

Security rule: the backend must verify the Keycloak token. Never trust `authenticated: true` or a browser-supplied `username` as a proof of identity.
