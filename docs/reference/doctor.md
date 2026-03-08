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
- signaux MongoDB
- plugins Feathers détectés

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
- corriger la config auth
- vérifier la cible remote
