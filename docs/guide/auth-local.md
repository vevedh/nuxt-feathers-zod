---
editLink: false
---
# Auth locale (JWT)

Quand `feathers.auth = true` (et que tu **n’es pas** en Keycloak-only), le module active l’auth Feathers classique :

- stratégie `local` (login/password)
- endpoint `/feathers/authentication`
- JWT envoyé en `Authorization: Bearer ...`

## 1) Générer `users`

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --auth --idField _id --docs
```

## 2) Créer un user

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

## 3) Login

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Réponse : `{ accessToken, user, ... }`.

## 4) Appeler un service protégé

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Frontend

Si `client.pinia` est activé, tu peux utiliser les helpers `feathers-pinia` (ex: `useAuth()`).
