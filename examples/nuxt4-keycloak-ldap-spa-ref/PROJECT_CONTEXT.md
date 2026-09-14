# PROJECT_CONTEXT — nuxt4-keycloak-ldap-client

## Statut

Version validée comme **référence modèle Nuxt 4 + Keycloak + LDAP + SPA**.

## Stack

- Nuxt 4.5.2, requalifié dans le train coordonné Patch 059 avec Vue 3.5.42 et Vite 8.
- Quasar 2 via `nuxt-quasar-ui`.
- UnoCSS.
- Pinia + persistedstate.
- nuxt-feathers-zod 6.7.45.
- Keycloak côté client uniquement via `keycloak-js`.
- Backend Feathers remote exposant `POST /authentication`.
- Stratégie backend attendue : `keycloak-ldap` / `SsoLdapStrategy`.

## Décision d'architecture validée

Le flow Keycloak n'est pas orchestré par NFZ. NFZ reste le client Feathers remote.

Règles :

- Keycloak SSO reste côté client Nuxt ;
- `feathers.keycloak` est désactivé pour éviter tout appel legacy vers `/_keycloak` ;
- aucun endpoint Nitro proxy `/api/keycloak-ldap/**` n'est utilisé ;
- le backend LDAP est appelé directement via `api.service('authentication').create(...)` ;
- le backend Feathers vérifie le token Keycloak si nécessaire ;
- le backend Feathers cherche l'utilisateur dans LDAP/AD ;
- le backend retourne `accessToken` + `user` LDAP enrichi ;
- le store `sso-session` conserve l'identité Keycloak ;
- le store `ldap-session` conserve l'identité backend/LDAP ;
- après authentification Keycloak réussie, l'application lance automatiquement la synchronisation LDAP ;
- l'URL est nettoyée après `keycloak.init()` pour supprimer `#state=...&session_state=...&code=...`.

## Payload backend

```json
{
  "strategy": "keycloak-ldap",
  "username": "jdupont",
  "authenticated": true,
  "access_token": "<token Keycloak>",
  "tokenParsed": {},
  "ssoUser": {},
  "reason": "auto-after-keycloak"
}
```

## Configuration NFZ critique

- `NFZ_REMOTE_REST_PATH` doit rester vide si le backend expose `/authentication` à la racine.
- Pas de `remote.auth.payloadMode='keycloak'`.
- Pas de proxy Nitro local.
- Pas de configuration NFZ Keycloak.
- `keycloak: false`, `auth: false`, `server.enabled=false` côté NFZ client.

## Point backend obligatoire

Le backend doit répondre aux preflights :

```txt
OPTIONS /authentication
```

En développement, CORS doit autoriser :

```txt
http://localhost:3000
```

Si le backend journalise `Method OPTIONS not allowed`, l'appel direct NFZ échouera avec `Failed to fetch` côté navigateur.

## Baseline SPA Nuxt 4.5.2

- Application volontairement en `ssr: false` car Keycloak reste strictement côté client.
- Nuxt est verrouillé sur `4.5.2`. Le précédent pin 4.4.2 lié à `No entry found in rollupOptions.input` est superseded par la requalification coordonnée Nuxt 4.5.2 / Vue 3.5.42 / Vite 8 du Patch 059 ; toute réapparition doit rester un échec de gate, pas être masquée par un downgrade implicite.
- Après chaque changement de version Nuxt, nettoyage complet Windows recommandé : `.nuxt`, `.output`, `node_modules`, caches Vite et `bun.lock`.

## Fichiers importants

```txt
app/plugins/keycloak.client.ts              # Keycloak client-only + nettoyage URL post-init
app/plugins/keycloak-ldap-bridge.client.ts  # auto-sync LDAP après Keycloak
app/composables/useKeycloakLdapBridge.ts    # appel NFZ remote direct vers /authentication
app/stores/sso-session.ts                   # ssoUser/ssoToken Keycloak
app/stores/ldap-session.ts                  # feathersUser/feathersToken LDAP
```
