# Intégrer NFZ + Redis cache dans une vraie application Nuxt 4 + DaisyUiKit + Pinia

Exemple source maintenu pour **nuxt-feathers-zod 6.8.0**. Il montre une application métier complète avec Nuxt 4, Vue 3, DaisyUiKit, **Tailwind CSS 4** (choisi ici parmi l'alternative UnoCSS/Tailwind), Pinia, MongoDB, FeathersJS v5 embedded, auth locale/JWT, RBAC `admin/member`, Redis et thèmes DaisyUI.

> NFZ 6.8.0 ne possède pas d'option publique `feathers.cache`. Le cache Redis de cet exemple utilise la couche serveur Nitro/Unstorage. Le cœur NFZ reste inchangé.

## Démarrage

```bash
cp .env.example .env
bun install
bun run db:up
bun run dev
```

Puis ouvrir `http://localhost:3000`.

Compte de démonstration local : `admin` / `admin123`. Ce mot de passe est volontairement faible pour le poste de développement. Le module de seed refuse les mots de passe de démonstration faibles en production.

## Architecture

```txt
Browser
  └─ Nuxt 4 + DaisyUiKit + Pinia
       ├─ NFZ client embedded + JWT
       ├─ /feathers/*
       │    └─ FeathersJS v5
       │         ├─ users -> MongoDB
       │         └─ messages -> MongoDB
       └─ /api/dashboard/summary
            ├─ vérification JWT via Feathers
            ├─ agrégation des services NFZ
            └─ Redis via Nitro/Unstorage (TTL)
```

## Pourquoi le cache n'est pas dans `feathers` ?

Depuis 6.8.0 Patch073 r1, `ModuleOptions` expose `cache` avec le provider natif `memory`. Cette révision ne fournit toutefois pas encore de provider `redis` : l'exemple Redis reste volontairement une intégration applicative Nitro/Unstorage. Pour ce scénario distribué, l'intégration recommandée en r1 est :

1. Redis monté côté serveur avec `unstorage/drivers/redis` ;
2. secrets dans `runtimeConfig` privé ;
3. cache placé après authentification lorsque la réponse dépend d'un espace protégé ;
4. aucune donnée personnelle dans une clé partagée ;
5. TTL court et invalidation explicite lors des mutations métier ;
6. lecture/écriture Redis en mode fail-open pour que le dashboard reste disponible si le cache est momentanément indisponible.

## Variables Redis

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6380/0
REDIS_PREFIX=nfz:daisyui
REDIS_CACHE_TTL_SECONDS=60
```

Ne place jamais `REDIS_URL` dans `runtimeConfig.public`.

## Invalidation métier

Le dashboard accepte `?refresh=1` pour recomposer la valeur. Dans une application réelle, ajoute également une invalidation dans les hooks `after` des services qui modifient les données agrégées (`create`, `patch`, `remove`).

## Thèmes

La barre supérieure permet de basculer entre `light`, `dark`, `corporate`, `emerald`, `business` et `night`. Le choix est conservé dans `localStorage`; aucune donnée sensible n'y est stockée.
