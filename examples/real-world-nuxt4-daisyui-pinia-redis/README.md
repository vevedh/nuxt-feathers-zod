# Intégrer NFZ + Redis cache dans une vraie application Nuxt 4 + DaisyUiKit + Pinia

Exemple source maintenu pour **nuxt-feathers-zod 6.9.1**. Il montre une application métier complète avec Nuxt 4, Vue 3, DaisyUiKit, **Tailwind CSS 4** (choisi ici parmi l'alternative UnoCSS/Tailwind), Pinia, MongoDB, FeathersJS v5 embedded, auth locale/JWT, RBAC `admin/member`, Redis et thèmes DaisyUI.

> NFZ 6.9.1 utilise ici le provider natif `redis`. Le même runtime a passé le contrat réel contre Redis et Valkey ; `ioredis` reste un peer optionnel de NFZ et une dépendance directe de cet exemple.

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
            └─ cache NFZ natif -> Redis/Valkey (TTL)
```

## Cache NFZ natif

Le cache distribué est configuré directement dans `feathers.cache` avec le provider natif `redis`. Redis et Valkey utilisent le même contrat NFZ. L'URL reste côté serveur et n'est jamais exposée dans `runtimeConfig.public`.

`getOrSet()` évite les producteurs concurrents uniquement dans un même processus Node : ce n'est pas un verrou distribué entre plusieurs replicas. L'invalidation de namespace du provider utilise `SCAN` + `UNLINK`, jamais `KEYS`.

## Variables Redis

```dotenv
REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6380/0
REDIS_PREFIX=nfz:daisyui
REDIS_CACHE_TTL_MS=60000
```

Ne place jamais `REDIS_URL` dans `runtimeConfig.public`.

## Invalidation métier

Le dashboard accepte `?refresh=1` pour recomposer la valeur. Dans une application réelle, ajoute également une invalidation dans les hooks `after` des services qui modifient les données agrégées (`create`, `patch`, `remove`).

## Thèmes

La barre supérieure permet de basculer entre `light`, `dark`, `corporate`, `emerald`, `business` et `night`. Le choix est conservé dans `localStorage`; aucune donnée sensible n'y est stockée.
