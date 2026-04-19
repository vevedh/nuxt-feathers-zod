---
editLink: false
---
# Playground

Le `playground/` sert à valider rapidement le socle open source du module.

## Ce qu’il permet de vérifier

- build embedded
- build remote
- connexion REST / Socket.IO
- auth locale / remote / Keycloak
- comportement d’un service généré

## Pages utiles

- `/tests` : diagnostics connexion + auth
- `/messages` : exemple CRUD simple
- `/ldapusers` : exemple de service remote déclaré explicitement
- `/auth-runtime` : diagnostics du runtime auth unifié + trace récente
- `/mongo` : démo Mongo protégée basée sur `useMongoManagementClient()` et `useProtectedPage()`

## Routine de validation recommandée

### 1) Valider la build module

```bash
bun run build
```

### 2) Lancer le playground

```bash
bun dev
```

### 3) Vérifier `/tests`

Contrôles utiles :

- appel `find()` sur un service déclaré
- auth locale
- auth token payload
- SSO Keycloak si activé

## Pourquoi le playground est important

Pour figer le core open source, il doit rester un terrain de validation simple et stable.


## Embedded + MongoDB

Le playground inclut désormais un scénario `embedded+mongodb` prêt à l'emploi via `playground/.env.embedded-mongodb.example`.
Le mode utilise `mongodb-memory-server` pour fournir un `mongodbClient` valide aux services générés avec l'adapter `mongodb`.


## Désactiver MongoDB mémoire pour les runs remote-only

Si vous voulez valider uniquement le mode remote sans démarrer `mongodb-memory-server`, définissez `NFZ_PLAYGROUND_EMBEDDED_MONGODB=false`.
La valeur par défaut reste `true` pour conserver le scénario embedded + MongoDB prêt à l'emploi.

> Embedded Mongo management calls use the embedded REST prefix. With REST path `/feathers` and Mongo base path `/mongo`, the effective client path is `/feathers/mongo/...`.

> Sur `/auth-runtime`, `status = anonymous` avec `tokenSource = none` signifie simplement qu'aucun token n'est encore stocké. Ce n'est plus traité comme une erreur depuis `6.4.125`.
