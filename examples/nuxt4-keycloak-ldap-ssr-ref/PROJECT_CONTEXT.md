# PROJECT_CONTEXT — nuxt4-keycloak-ldap-ssr

## Objectif

Version SSR du modèle Nuxt 4 + Keycloak + LDAP + NFZ 6.5.30.

## Architecture validée

- Nuxt 4 avec `ssr: true`.
- Quasar 2 via `nuxt-quasar-ui`.
- UnoCSS.
- Pinia.
- NFZ 6.5.30 en mode `remote` direct vers le backend Feathers.
- Keycloak strictement côté client via `keycloak-js`.
- LDAP strictement côté backend Feathers via stratégie `keycloak-ldap` / `sso-ldap`.
- Aucun proxy Nitro `/api/keycloak-ldap`.
- Aucune gestion Keycloak dans le runtime NFZ.

## Règle SSR importante

Le serveur ne connaît pas la session Keycloak navigateur. Les zones dépendantes de :

- `keycloak.token` ;
- `tokenParsed` ;
- session LDAP ;
- boutons login/logout ;
- profil utilisateur ;

sont rendues avec `<ClientOnly>` pour éviter les mismatches d'hydratation.

## Flow

1. SSR rend un shell stable.
2. Côté client, Keycloak s'initialise.
3. Après `keycloak.init()`, l'URL est nettoyée pour retirer `#state=...`.
4. La synchro LDAP démarre automatiquement.
5. NFZ appelle directement `POST https://api.example.local/authentication`.
6. Le backend retourne `accessToken`, `authentication`, `user` enrichi LDAP.

## Contraintes backend

Le backend doit accepter :

```txt
OPTIONS /authentication
POST /authentication
```

Le CORS doit répondre au preflight avant Feathers REST.
