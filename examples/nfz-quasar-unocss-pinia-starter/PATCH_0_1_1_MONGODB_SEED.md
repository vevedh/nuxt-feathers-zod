# PATCH 0.1.1 — MongoDB + seed admin

Ce patch corrige l’oubli de la base MongoDB et du seed utilisateur dans le starter.

## Ajouts

- `docker-compose.yaml` avec MongoDB 7.
- `.env.example` complet pour MongoDB et le seed admin.
- `feathers.database.mongo.url` dans `nuxt.config.ts`.
- `database.mongo.management` activé sous `/mongo-admin` côté Feathers REST.
- Services `users` et `messages` basés sur `MongoDBService`.
- Seed Feathers post-services : indexes + user admin + message initial.

## Commandes

```bash
bun install
cp .env.example .env
bun run db:up
bun dev
```

Compte de démo :

```txt
admin / admin123
```
