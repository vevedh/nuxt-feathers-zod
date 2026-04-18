---
editLink: false
---
# Auth locale (JWT)

Quand `feathers.auth = true` en mode embedded, le module peut utiliser l’auth Feathers classique :

- stratégie `local`
- endpoint `authentication`
- JWT côté client

## Exemple : nouvelle app Nuxt 4 + auth locale

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id --docs
bun dev
```

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

## Créer un utilisateur

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

## Se connecter

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

## Appeler un service protégé

```bash
curl http://localhost:3000/feathers/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Notes de stabilisation

- `users` reste le service de référence pour l’auth embedded
- générer `users` via la CLI
- éviter d’activer `auth` sans service `users` détectable
