---
editLink: false
---
# Authentication provider registry

Version `6.6.0` introduces an extensible authentication registry for embedded mode. It combines several authentication mechanisms without duplicating security logic across Feathers services.

The legacy `authStrategies`, `auth.local`, and `auth.jwtOptions` options remain supported. New projects that require more than one provider should use `auth.providers`.

## Registry contract

The registry installs Feathers strategies at startup and exposes a normalized identity through:

```ts
context.params.principal
```

```ts
interface NfzPrincipal {
  subject: string
  provider: string
  tenantId?: string
  organizationId?: string
  sessionId?: string
  username?: string
  email?: string
  roles: string[]
  permissions: string[]
  scopes: string[]
  authenticationMethods: string[]
  assuranceLevel: 'aal1' | 'aal2' | 'aal3'
  issuedAt?: number
  expiresAt?: number
}
```

RBAC hooks read `params.principal.roles` first and keep the legacy user-role fallback for compatibility.

## Local, JWT, OIDC, and API key configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    auth: {
      service: 'users',
      entity: 'user',
      entityClass: 'User',

      providers: {
        local: {
          type: 'local',
          usernameField: 'email',
          passwordField: 'password',
        },

        jwt: {
          type: 'jwt',
        },

        enterprise: {
          type: 'oidc',
          issuer: process.env.NFZ_OIDC_ISSUER!,
          audience: process.env.NFZ_OIDC_AUDIENCE!,
          userService: 'users',
          subjectField: 'oidcSubject',
          userProvisioning: 'disabled',
          assuranceLevel: 'aal2',
          claims: {
            tenant: 'tenant_id',
            organization: 'organization_id',
            roles: 'realm_access.roles',
            permissions: 'permissions',
            scopes: 'scope',
          },
        },

        automation: {
          type: 'api-key',
          header: 'x-api-key',
          issueAccessToken: false,
          pepper: process.env.NFZ_API_KEY_PEPPER,
          keys: [
            {
              id: 'release-bot',
              subject: 'service:release-bot',
              hash: process.env.NFZ_RELEASE_BOT_API_KEY_HASH!,
              roles: ['automation'],
              scopes: ['releases:write'],
              assuranceLevel: 'aal2',
            },
          ],
        },
      },

      keys: {
        mode: 'asymmetric',
        algorithm: 'RS256',
        privateKey: process.env.NFZ_AUTH_PRIVATE_KEY,
        publicKey: process.env.NFZ_AUTH_PUBLIC_KEY,
        keyId: process.env.NFZ_AUTH_KEY_ID,
      },
    },
  },
})
```

The OIDC provider validates bearer JWTs through issuer discovery and JWKS verification. It does not implement an interactive browser Authorization Code + PKCE flow. Keycloak, Entra ID, Auth0, Okta, or Zitadel can be used when they expose an OIDC issuer and API-compatible tokens.

When a declarative provider issues an NFZ access token (`issueAccessToken: true`) and no `jwt` provider is declared, the resolver adds the internal JWT provider automatically. The issued token therefore remains verifiable on later requests. An API-key-only configuration with `issueAccessToken: false` does not load JWT unnecessarily.

Local-user mapping is fail-closed by default. `allowClaimsOnlyIdentity: true` explicitly permits a verified-claims identity when no local account is required. The experimental `failOpen` alias is deprecated and rejected in production; database or provisioning failures never trigger a silent fallback.

## Credential parsing order

`parseStrategies` defines the order in which Feathers inspects an HTTP request. NFZ places external providers before the local JWT strategy by default:

```ts
feathers: {
  auth: {
    parseStrategies: ['enterprise', 'automation', 'jwt'],
  },
}
```

This prevents an external JWT from being claimed prematurely by the local JWT strategy.

## Protecting services

New generated services use the provider-aware hook:

```ts
import { authenticateNfz } from 'nuxt-feathers-zod/server-auth'

export const messages = (app: Application) => {
  app.service('messages').hooks({
    around: {
      all: [authenticateNfz()],
    },
  })
}
```

A service may restrict the allowed providers:

```ts
authenticateNfz({ strategies: ['enterprise', 'jwt'] })
```

Internal Feathers calls without `params.provider` remain available. External calls without a verified identity are rejected. NFZ console services and MongoDB administration use the same provider-aware hook instead of being restricted to a local JWT.

## Provisioning an API key hash

Generate a high-entropy key, display it once, and store only its hash:

```ts
// scripts/provision-api-key.ts
import { randomBytes } from 'node:crypto'
import { hashNfzApiKey } from 'nuxt-feathers-zod/auth'

const id = 'release-bot'
const secret = randomBytes(32).toString('base64url')
const pepper = process.env.NFZ_API_KEY_PEPPER ?? ''
const hash = hashNfzApiKey(secret, pepper)

console.log(JSON.stringify({
  credential: `${id}.${secret}`,
  hash,
}, null, 2))
```

Give `credential` to the client once. Keep only `id` and `hash` in configuration or a secrets vault.

## Registering a custom strategy

```ts
import type { AuthenticationRequest, AuthenticationResult } from '@feathersjs/authentication'
import { AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { registerNfzAuthenticationProvider } from 'nuxt-feathers-zod/server-auth'

class InternalGatewayStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: AuthenticationRequest): Promise<AuthenticationResult> {
    return {
      authentication: { strategy: this.name },
      principal: {
        subject: String(authentication.subject),
        provider: this.name,
        roles: ['internal'],
        permissions: [],
        scopes: [],
        authenticationMethods: [this.name],
        assuranceLevel: 'aal2',
      },
    }
  }
}

export default defineFeathersServerPlugin((app) => {
  registerNfzAuthenticationProvider(app, 'internal-gateway', new InternalGatewayStrategy(), {
    type: 'custom',
    parse: false,
    issueAccessToken: false,
  })
})
```

Custom credentials must always be verified server-side. A provider name, role, or tenant sent by a browser is not proof of identity.

## JWT secret policy

Production startup fails when embedded authentication has no safe signing configuration.

### Symmetric mode

```bash
NFZ_AUTH_SECRET=<random secret containing at least 32 bytes>
```

Do not derive the secret from the project path, application name, or a demo value.

### Asymmetric mode

```bash
NFZ_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
NFZ_AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
NFZ_AUTH_ALGORITHM=RS256
NFZ_AUTH_KEY_ID=2026-01
```

Only signing components receive the private key. Verification-only components need the public key. RSA pairs are validated at startup, must match, and must use at least 2,048 bits. The algorithm is pinned for both signing and verification to prevent algorithm-confusion paths.

Development mode generates an ephemeral random secret when none is configured. Existing sessions are intentionally invalidated after a restart.

## Legacy migration

The previous configuration remains valid:

```ts
feathers: {
  auth: {
    authStrategies: ['local', 'jwt'],
    local: {
      usernameField: 'email',
      passwordField: 'password',
    },
  },
}
```

Its declarative equivalent is:

```ts
feathers: {
  auth: {
    providers: {
      local: {
        type: 'local',
        usernameField: 'email',
        passwordField: 'password',
      },
      jwt: {
        type: 'jwt',
      },
    },
  },
}
```

Migration can therefore be gradual. Services generated by `6.6.0` use `authenticateNfz()`, while older services protected by `authenticate('jwt')` remain supported.

## 6.6.0 boundaries

- The OIDC provider validates access tokens; it does not drive interactive browser login.
- Passkeys, TOTP, magic links, and device sessions are not yet part of the stable core.
- Declarative API keys target a limited number of service accounts. Manage rotation and auditing in your application.
- The current version keeps MongoDB as the module’s primary database integration.

<!-- release-version: 6.6.0 -->
