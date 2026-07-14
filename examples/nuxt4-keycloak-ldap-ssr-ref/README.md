# Nuxt 4 SSR + Quasar + UnoCSS + NFZ 6.5.30 remote + Keycloak client-only + LDAP backend

Cette application est une **déclinaison SSR** du modèle validé `nuxt4-keycloak-ldap-spa`.

Le principe reste identique côté sécurité et architecture :

```txt
Keycloak = uniquement côté client Nuxt
NFZ 6.5.30 = client Feathers remote direct
LDAP = uniquement côté backend Feathers
SSR Nuxt = actif, mais sans orchestration Keycloak côté serveur
```

## Différence avec la version SPA

La version SPA avait :

```ts
ssr: false
```

Cette version utilise :

```ts
ssr: true
```

Pour rester robuste, toutes les zones dépendantes de Keycloak, du token navigateur ou de l'utilisateur LDAP sont rendues avec `<ClientOnly>`. Le serveur produit donc un shell SSR stable, puis le client finalise :

1. initialisation Keycloak via `keycloak-js` ;
2. finalisation du callback OIDC ;
3. nettoyage de l'URL `#state=...&session_state=...&code=...` ;
4. synchronisation LDAP automatique via NFZ remote ;
5. affichage de l'utilisateur LDAP enrichi.

## Ce que cette version SSR ne fait pas

Elle ne transforme pas Keycloak en authentification SSR serveur.

Il n'y a pas :

```txt
- de proxy Nitro /api/keycloak-ldap ;
- de gestion Keycloak dans le runtime NFZ ;
- de lecture serveur du token Keycloak ;
- de session httpOnly côté Nuxt ;
- de stratégie Nuxt server-side OIDC.
```

C'est volontaire. Keycloak reste un flux navigateur, et NFZ reste le client Feathers remote.

## Installation

```bash
bun install
bun dev
```

Nettoyage recommandé après changement d'archive ou de version Nuxt/NFZ :

```powershell
bun run clean:repo
Remove-Item -Recurse -Force .nuxt,node_modules,.output,node_modules\.vite,node_modules\.cache, .\bun.lock -ErrorAction SilentlyContinue
bun install
bun dev
```

## Variables

Copie `.env.example` vers `.env`.

```txt
NFZ_REMOTE_URL=https://api.example.local
NFZ_REMOTE_REST_PATH=
NFZ_REMOTE_SOCKET_PATH=/socket.io

KEYCLOAK_SERVER_URL=https://keycloak.example.local
KEYCLOAK_REALM=EXAMPLE
KEYCLOAK_CLIENT_ID=nuxt4app
KEYCLOAK_ON_LOAD=check-sso

NUXT_PUBLIC_LDAP_AUTO_SYNC=true
NUXT_PUBLIC_AUTH_DEBUG=true
```

## Configuration NFZ

Le backend expose `/authentication` à la racine. Le `restPath` NFZ doit donc rester vide :

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: process.env.NFZ_REMOTE_URL || 'https://api.example.local',
      transport: 'rest',
      restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
      services: [
        {
          path: 'authentication',
          methods: ['create', 'remove'],
        },
      ],
    },
    pinia: true,
  },

  keycloak: false,
  auth: false,
  server: {
    enabled: false,
  },
}
```

`keycloak: false` est volontaire : Keycloak n'est pas piloté par NFZ. Il est initialisé dans `app/plugins/keycloak.client.ts`.

## Payload envoyé au backend Feathers

La synchronisation LDAP utilise NFZ remote direct :

```ts
api.service('authentication').create({
  strategy: 'keycloak-ldap',
  username,
  authenticated: true,
  access_token: keycloakToken,
  tokenParsed,
  ssoUser: tokenParsed,
  reason: 'auto-after-keycloak',
})
```

Le bouton **Synchroniser LDAP** relance le même flux avec `reason: 'manual-refresh'`.

## Backend Feathers requis

Le backend doit enregistrer une stratégie :

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

Et répondre à :

```txt
POST https://api.example.local/authentication
```

Résultat attendu :

```json
{
  "accessToken": "jwt-feathers",
  "authentication": {
    "strategy": "keycloak-ldap"
  },
  "user": {
    "username": "...",
    "email": "...",
    "ldap": {},
    "sso": {}
  }
}
```

## Point indispensable : CORS / OPTIONS côté backend

Comme l'appel est direct depuis le navigateur vers `https://api.example.local/authentication`, le backend doit accepter le preflight :

```txt
OPTIONS /authentication
```

Exemple Express/Feathers :

```js
import cors from 'cors'
import express from '@feathersjs/express'

const allowedOrigins = [
  'http://localhost:3000',
]

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS origin rejected: ${origin}`))
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
```

À placer avant `app.configure(express.rest())` et avant l'enregistrement des services.

## Flux final SSR

```txt
1. Nuxt rend la page côté serveur avec un shell stable.
2. Les blocs session/auth sont rendus côté client via ClientOnly.
3. app/plugins/keycloak.client.ts initialise Keycloak.
4. Keycloak finalise le callback OAuth/OIDC.
5. L'application nettoie l'URL après keycloak.init().
6. app/plugins/keycloak-ldap-bridge.client.ts lance la synchronisation LDAP.
7. useKeycloakLdapBridge appelle api.service('authentication').create(...).
8. Le backend vérifie/consomme le contexte Keycloak, cherche l'utilisateur LDAP, retourne user + accessToken Feathers.
9. Le store ldap-session affiche l'utilisateur LDAP complet.
```

## Fichiers essentiels

```txt
nuxt.config.ts                              # ssr:true + NFZ remote + Keycloak désactivé dans NFZ
app/plugins/keycloak.client.ts              # Keycloak client-only + nettoyage URL
app/plugins/keycloak-ldap-bridge.client.ts  # auto-sync LDAP après Keycloak
app/composables/useKeycloakLdapBridge.ts    # appel direct NFZ remote /authentication
app/stores/sso-session.ts                   # état Keycloak non persistant serveur
app/stores/ldap-session.ts                  # état Feathers/LDAP non persistant serveur
app/layouts/default.vue                     # shell SSR + zones auth ClientOnly
app/pages/profil.vue                        # page protégée avec guard client-only
```
