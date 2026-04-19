---
editLink: false
---
# Doctor

La commande :

```bash
bunx nuxt-feathers-zod doctor
```

analyse la configuration du projet courant.

## Vérifications typiques

### Mode embedded

- `feathers.client.mode`
- `transports.rest.path`
- `servicesDirs`
- services embedded détectés
- auth embedded :
  - `auth.enabled`
  - `auth.service`
  - `auth.entity`
  - `auth.authStrategies`
  - `auth.local.usernameField`
  - `auth.local.passwordField`
  - `auth.local.entityUsernameField`
  - `auth.local.entityPasswordField`
  - exemple de payload local Feathers (`{ strategy: 'local', ... }`)
  - warning si les champs de requête et d’entité divergent
- signaux MongoDB
- plugins Feathers détectés
- indices de configuration `database.mongo`

### Mode remote

- URL distante configurée
- transport `rest | socketio`
- auth distante activée ou non
- `payloadMode`
- services distants déclarés
- configuration Keycloak si nécessaire

## Objectif

Le doctor doit fournir des messages actionnables, par exemple :

- générer un service manquant
- activer `servicesDirs`
- corriger la config auth locale
- vérifier la cible remote
- repérer un socle CLI/runtime incohérent avant de poursuivre une release OSS core

## Note auth locale

Quand le doctor détecte une cartographie locale différente entre les champs de requête et les champs d’entité (par exemple `email/password` côté formulaire mais `userId/passwordHash` côté entité), il émet un warning explicite. Dans ce cas, l’UI consommatrice doit utiliser `buildLocalAuthPayload()` ou `runtimeConfig.public._feathers.auth.local` au lieu de coder le payload local en dur.
