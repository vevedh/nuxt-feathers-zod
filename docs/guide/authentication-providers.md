---
editLink: false
---
# Registre des fournisseurs d’authentification

La version `6.6.0` introduit un registre d’authentification extensible pour le mode embedded. Il permet de combiner plusieurs mécanismes sans dupliquer la logique de sécurité dans chaque service Feathers.

Les configurations historiques `authStrategies`, `auth.local` et `auth.jwtOptions` restent prises en charge. Le nouveau contrat `auth.providers` devient la voie recommandée pour les projets qui utilisent plusieurs fournisseurs.

## Ce que fournit le registre

Le registre enregistre les stratégies Feathers au démarrage et publie une identité normalisée dans :

```ts
context.params.principal
```

Cette identité possède un contrat stable, quel que soit le fournisseur :

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

Les hooks RBAC utilisent d’abord `params.principal.roles`, tout en conservant le repli sur les anciennes propriétés utilisateur.

## Configuration locale, JWT, OIDC et clé API

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

Le provider OIDC de cette version valide un bearer JWT à partir du document de découverte et du JWKS de l’émetteur. Il ne remplace pas un flux interactif Authorization Code + PKCE dans le navigateur. Keycloak, Entra ID, Auth0, Okta ou Zitadel peuvent être utilisés dès lors qu’ils fournissent un issuer OIDC et des jetons adaptés à l’API.

Lorsqu’un provider déclaratif émet un access token NFZ (`issueAccessToken: true`) et qu’aucun provider `jwt` n’est déclaré, le résolveur ajoute automatiquement le provider JWT interne. Le token émis reste ainsi vérifiable lors des appels suivants. Une configuration uniquement composée de clés API avec `issueAccessToken: false` ne charge pas ce provider inutilement.

Le mapping vers un utilisateur local est fermé par défaut. `allowClaimsOnlyIdentity: true` autorise explicitement une identité fondée sur les claims vérifiés lorsqu’aucun compte local n’est requis. L’ancienne option expérimentale `failOpen` est dépréciée et refusée en production ; aucune erreur de base de données ou de provisioning ne déclenche un repli silencieux.

## Ordre de lecture des credentials

`parseStrategies` contrôle l’ordre dans lequel Feathers inspecte une requête HTTP. Sans configuration explicite, NFZ place les providers externes avant le JWT local :

```ts
feathers: {
  auth: {
    parseStrategies: ['enterprise', 'automation', 'jwt'],
  },
}
```

Cet ordre évite qu’un JWT externe soit interprété prématurément comme un jeton local.

## Protéger un service généré ou manuel

Les nouveaux services utilisent le hook provider-aware :

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

`authenticateNfz()` autorise les stratégies déclarées dans la configuration résolue. Pour un service très spécialisé, la liste peut être restreinte :

```ts
authenticateNfz({ strategies: ['enterprise', 'jwt'] })
```

Les appels internes Feathers sans `params.provider` restent possibles. Les appels externes sans identité valide sont refusés. Les services internes NFZ et l’administration MongoDB utilisent le même hook provider-aware ; ils ne sont plus limités à un JWT local lorsque des providers OIDC ou API key sont autorisés.

## Créer une empreinte de clé API

Une clé API doit être générée avec une source cryptographiquement sûre, affichée une seule fois, puis stockée uniquement sous forme d’empreinte.

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

La valeur `credential` est remise au client une seule fois. Seuls `id` et `hash` doivent être conservés dans la configuration ou dans un coffre de secrets.

## Ajouter une stratégie personnalisée

Une stratégie Feathers existante peut être enregistrée après l’initialisation du runtime :

```ts
import type { AuthenticationRequest, AuthenticationResult } from '@feathersjs/authentication'
import { AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { registerNfzAuthenticationProvider } from 'nuxt-feathers-zod/server-auth'

class InternalGatewayStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: AuthenticationRequest): Promise<AuthenticationResult> {
    // Valider ici un credential provenant d’une passerelle de confiance.
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

Le credential personnalisé doit toujours être validé côté serveur. Un nom de provider, un rôle ou un tenant reçu directement du navigateur ne constitue jamais une preuve d’identité.

## Politique des secrets JWT

En production, le runtime refuse de démarrer sans configuration sûre.

### Mode symétrique

```bash
NFZ_AUTH_SECRET=<secret aléatoire d’au moins 32 octets>
```

Le secret ne doit pas être dérivé du chemin du projet, du nom de l’application ou d’une valeur de démonstration.

### Mode asymétrique

```bash
NFZ_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
NFZ_AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
NFZ_AUTH_ALGORITHM=RS256
NFZ_AUTH_KEY_ID=2026-01
```

La clé privée reste uniquement sur les composants autorisés à signer. Les composants qui vérifient les jetons n’ont besoin que de la clé publique. Les paires RSA sont validées au démarrage, doivent correspondre et utiliser au minimum 2 048 bits. L’algorithme est verrouillé lors de la signature comme de la vérification afin d’éviter les confusions d’algorithme.

En développement, l’absence de secret produit une clé éphémère aléatoire. Les sessions deviennent volontairement invalides au redémarrage.

## Migration depuis la configuration historique

Cette configuration reste valide :

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

Sa forme déclarative équivalente est :

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

La migration peut donc être progressive. Les services générés en `6.6.0` utilisent `authenticateNfz()`, mais le runtime continue d’accepter les anciens services protégés par `authenticate('jwt')`.

## Limites de la 6.6.0

- Le provider OIDC valide les access tokens ; il ne pilote pas encore le login interactif du navigateur.
- Les passkeys, TOTP, magic links et sessions par appareil ne sont pas encore fournis par le cœur stable.
- Les clés API déclaratives conviennent à un nombre limité de comptes techniques. Gérez leur rotation et leur audit dans votre application.
- La version actuelle conserve MongoDB comme intégration de base de données principale du module.

<!-- release-version: 6.6.0 -->
