---
editLink: false
---
# Authentication

Embedded mode uses Feathers `AuthenticationService`. Since `6.6.0`, NFZ adds a provider registry and a normalized principal.

## Configuration contract

```ts
interface AuthOptions {
  service?: string
  entity?: string
  entityClass?: string
  authenticationService?: string

  providers?: Record<string, AuthenticationProviderOptions>
  authStrategies?: string[]
  parseStrategies?: string[]

  keys?: {
    mode?: 'symmetric' | 'asymmetric'
    algorithm?: string
    secret?: string
    privateKey?: string
    publicKey?: string
    keyId?: string
  }

  local?: AuthLocalOptions
  jwtOptions?: AuthJwtOptions
  client?: AuthClientOptions
}
```

`providers` declares available mechanisms. `authStrategies` remains supported for legacy configurations and controls which strategies may create access tokens. `parseStrategies` controls HTTP credential extraction order. When a declarative provider issues an NFZ token, a JWT verification provider is added automatically when missing.

## Built-in providers

| Type | Purpose | Default HTTP extraction | NFZ access token |
| --- | --- | --- | --- |
| `local` | username and password | none | yes |
| `jwt` | NFZ access token | bearer | existing token |
| `oidc` | external issuer bearer JWT | bearer | yes by default |
| `api-key` | service account | `x-api-key` | no by default |
| `oauth` | existing Feathers OAuth strategies | strategy-specific | yes |
| `custom` | application strategy | explicit | configurable |

See [Authentication provider registry](/en/guide/authentication-providers) for OIDC, API key, asymmetric key, and custom provider examples.

## Normalized principal

Successful authentication adds:

```ts
context.params.principal
```

The principal contains at least `subject`, `provider`, `roles`, `permissions`, `scopes`, `authenticationMethods`, and `assuranceLevel`. Tenant, organization, session, username, and email fields are optional.

Services must never accept a principal supplied by the client. Only a registered strategy may create it after credential verification.

## Provider-aware hook

```ts
import { authenticateNfz } from 'nuxt-feathers-zod/server-auth'

app.service('messages').hooks({
  around: {
    all: [authenticateNfz()],
  },
})
```

Without arguments, the hook uses the resolved provider list. A service can restrict it:

```ts
authenticateNfz({ strategies: ['enterprise', 'jwt'] })
```

Legacy `authenticate('jwt')` hooks remain supported.

## JWT keys

Production embedded authentication requires either:

- `NFZ_AUTH_SECRET` containing at least 32 bytes;
- an `NFZ_AUTH_PRIVATE_KEY` / `NFZ_AUTH_PUBLIC_KEY` pair.

Weak, demo, or project-path-derived secrets are rejected. Development mode generates an ephemeral random key when none is configured. Algorithms are restricted to a known allowlist, asymmetric pairs must match, and RSA keys must use at least 2,048 bits.

## Public runtime metadata

`runtimeConfig.public._feathers.auth` exposes only client-safe metadata:

- provider names and types;
- strategy order;
- public OIDC issuer/audience values;
- local login field names;
- authentication service path.

Secrets, private keys, peppers, API key hashes, and service identities are never copied into public runtime configuration.

<!-- release-version: 6.6.0 -->
