---
editLink: false
---
# Local auth (JWT)

When `feathers.auth = true` in embedded mode, the module can use classic Feathers auth:

- `local` strategy
- `authentication` endpoint
- JWT on the client side

## Example: new Nuxt 4 app + local auth

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

## Create a user

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

## Login

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

## Call a protected service

```bash
curl http://localhost:3000/feathers/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Stabilization notes

- `users` remains the reference service for embedded auth
- generate `users` through the CLI
- avoid enabling `auth` without a detectable `users` service
