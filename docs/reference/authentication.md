---
editLink: false
---
# Authentification

Le runtime embedded repose sur `AuthenticationService` de Feathers et ajoute, depuis `6.6.0`, un registre de providers ainsi qu’un principal normalisé.

## Contrat de configuration

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

`providers` déclare les mécanismes disponibles. `authStrategies` reste accepté pour les configurations historiques et pour contrôler les stratégies autorisées lors de la création d’un access token. `parseStrategies` contrôle l’ordre d’extraction des credentials depuis les requêtes HTTP. Lorsqu’un provider déclaratif émet un token NFZ, un provider JWT de vérification est ajouté automatiquement s’il manque.

## Providers intégrés

| Type | Usage | Extraction HTTP par défaut | Access token NFZ |
| --- | --- | --- | --- |
| `local` | identifiant et mot de passe | non | oui |
| `jwt` | access token NFZ | bearer | jeton existant |
| `oidc` | bearer JWT d’un issuer externe | bearer | oui par défaut |
| `api-key` | compte technique | `x-api-key` | non par défaut |
| `oauth` | stratégies Feathers OAuth existantes | selon stratégie | oui |
| `custom` | stratégie applicative | explicite | configurable |

Le guide [Registre des fournisseurs d’authentification](/guide/authentication-providers) décrit les configurations OIDC, API key, clés asymétriques et stratégies personnalisées.

## Principal normalisé

Une authentification réussie ajoute :

```ts
context.params.principal
```

Le principal contient au minimum `subject`, `provider`, `roles`, `permissions`, `scopes`, `authenticationMethods` et `assuranceLevel`. Les champs de tenant, organisation, session, nom d’utilisateur et e-mail sont optionnels.

Les services ne doivent pas accepter un principal fourni par le client. Seule une stratégie enregistrée peut le produire après validation du credential.

## Hook provider-aware

```ts
import { authenticateNfz } from 'nuxt-feathers-zod/server-auth'

app.service('messages').hooks({
  around: {
    all: [authenticateNfz()],
  },
})
```

Sans argument, le hook utilise la liste résolue dans la configuration. Une liste peut être imposée localement :

```ts
authenticateNfz({ strategies: ['enterprise', 'jwt'] })
```

Les anciens hooks `authenticate('jwt')` restent fonctionnels.

## Clés JWT

En production, l’authentification embedded exige soit :

- `NFZ_AUTH_SECRET`, avec au moins 32 octets ;
- une paire `NFZ_AUTH_PRIVATE_KEY` / `NFZ_AUTH_PUBLIC_KEY`.

Les secrets faibles, de démonstration ou dérivés du chemin de l’application sont refusés. Sans secret en développement, une clé aléatoire éphémère est générée. Les algorithmes sont limités à une liste connue, les paires asymétriques doivent correspondre et les clés RSA doivent utiliser au minimum 2 048 bits.

## Runtime public

`runtimeConfig.public._feathers.auth` expose uniquement les métadonnées nécessaires au client :

- noms et types des providers ;
- ordre des stratégies ;
- issuer/audience OIDC publics ;
- champs de login local ;
- chemin du service d’authentification.

Les secrets, clés privées, peppers, empreintes de clés API et identités techniques ne sont jamais copiés dans la configuration publique.

<!-- release-version: 6.6.0 -->
