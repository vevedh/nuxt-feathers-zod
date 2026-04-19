
> 6.4.133 note: the default local auth mapping is restored to `userId/password`, matching the current NFZ CLI/playground auth-ready baseline in this repository.
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

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

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


## Runtime metadata for local auth fields

The module now exposes the resolved local auth config on the public runtime side:

```ts
const pub = useRuntimeConfig().public
console.log(pub._feathers.auth.local)
// {
//   usernameField: 'userId',
//   passwordField: 'password',
//   entityUsernameField: 'userId',
//   entityPasswordField: 'password'
// }
```

Consumer login forms can therefore build the local payload without guessing hidden defaults:

```ts
import { buildLocalAuthPayload } from 'nuxt-feathers-zod/auth-utils'

const auth = useRuntimeConfig().public._feathers.auth
const payload = buildLocalAuthPayload(login.value, password.value, auth?.local)
await useAuthRuntime().authenticate(payload)
```

> Important — Since `6.4.123`, NFZ also injects the resolved embedded auth config into Feathers on the server side with `app.set('authentication', config)` before `AuthenticationService` is instantiated. This is what makes the runtime-exposed local field mapping effective end-to-end for `LocalStrategy`.

## Call a protected service

```bash
curl http://localhost:3000/feathers/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Stabilization notes

- `users` remains the reference service for embedded auth
- generate `users` through the CLI
- avoid enabling `auth` without a detectable `users` service
