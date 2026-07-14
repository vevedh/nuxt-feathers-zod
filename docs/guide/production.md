# Mise en production

Cette page regroupe les contrôles à effectuer avant de publier une application basée sur `nuxt-feathers-zod`.

## Objectif

Une application prête pour la production doit avoir :

- une configuration Nuxt claire ;
- des services générés ou structurés selon les conventions du module ;
- une authentification testée ;
- une séparation nette entre configuration publique et secrets serveur ;
- des actions d'administration dangereuses désactivées par défaut ;
- une documentation d'exploitation lisible pour l'équipe projet.

## Checklist rapide

```bash
bunx nuxt-feathers-zod doctor
bunx nuxi prepare
bun run typecheck
bun run build
```

À vérifier ensuite :

- le dossier `services/` existe si `feathers.servicesDirs` vaut `['services']` ;
- le fichier `services/.nfz/manifest.json` est cohérent avec les services réellement présents ;
- les stratégies d'authentification déclarées dans `feathers.auth` existent côté backend ;
- les variables d'environnement sensibles ne sont pas exposées dans `public` ;
- les URLs remote sont correctes pour REST et Socket.io ;
- les routes protégées redirigent correctement en cas de session absente.

## Configuration minimale recommandée

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { enabled: true, path: '/feathers' },
      websocket: { enabled: true },
    },
    auth: {
      enabled: true,
      strategies: ['local', 'jwt'],
    },
    database: {
      mongodb: {
        enabled: true,
        url: process.env.MONGO_URL,
      },
    },
  },
})
```

## Services

La méthode recommandée consiste à générer les services par CLI.

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

Cette approche conserve :

- le manifeste `.nfz` ;
- les conventions de nommage ;
- les schémas ;
- les hooks ;
- les imports partagés ;
- la compatibilité avec le scanner runtime.

## Authentification

Pour une application locale/JWT :

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
```

Pour une application remote avec Keycloak :

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth \
  --payloadMode keycloak \
  --tokenField access_token
```

En production, le flux doit être validé dans ces situations :

- login initial ;
- refresh navigateur ;
- expiration de token ;
- route protégée ;
- appel de service protégé ;
- logout ;
- échec d'authentification.

## MongoDB management

Les endpoints d'administration MongoDB doivent rester conservateurs.

Options recommandées par défaut :

- lecture activée seulement si nécessaire ;
- création de base ou collection désactivée ;
- suppression de document désactivée ;
- drop database et drop collection désactivés ;
- accès limité à une allowlist de bases lorsque c'est possible.

## Runtime config

Les valeurs publiques peuvent être exposées dans `runtimeConfig.public._feathers`.
Les secrets doivent rester dans la partie privée du runtime config ou dans les variables d'environnement serveur.

Exemples de secrets à ne jamais exposer côté client :

- URL MongoDB complète avec identifiants ;
- secret JWT ;
- secret Keycloak confidentiel ;
- credentials SMTP ;
- clés d'administration.

## Smoke tests conseillés

Avant livraison :

1. Démarrer l'application en mode production local.
2. Vérifier `/feathers` ou le chemin REST configuré.
3. Se connecter avec un compte de test.
4. Appeler un service public.
5. Appeler un service protégé.
6. Vérifier la restauration de session après refresh.
7. Vérifier les logs serveur en cas d'erreur d'authentification.
8. Tester une erreur contrôlée et vérifier sa remontée côté UI.

## Bonnes pratiques

- Ne pas créer les services à la main lorsque la CLI peut les générer.
- Versionner le manifeste `.nfz`.
- Conserver les hooks métier proches du service.
- Encapsuler les accès critiques dans des composables ou stores métier.
- Éviter les appels directs dispersés à `$api.service(...)` dans les pages sensibles.
- Garder les actions destructives désactivées par défaut.
