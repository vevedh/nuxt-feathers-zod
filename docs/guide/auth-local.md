---
editLink: false
---
> Note 6.4.133 : le mapping local par défaut revient à `userId/password`, cohérent avec la base auth-ready actuelle CLI/playground dans ce dépôt.

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
bun add nuxt-feathers-zod feathers-swagger swagger-ui-dist
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


## Métadonnées runtime des champs locaux

Le module expose maintenant la config locale résolue côté runtime public :

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

Pour un formulaire consommateur, tu peux donc construire le payload local sans hypothèse cachée :

```ts
import { buildLocalAuthPayload } from 'nuxt-feathers-zod/auth-utils'

const auth = useRuntimeConfig().public._feathers.auth
const payload = buildLocalAuthPayload(login.value, password.value, auth?.local)
await useAuthRuntime().authenticate(payload)
```

> Important — Depuis `6.4.123`, NFZ injecte aussi la configuration d’auth embedded résolue dans Feathers côté serveur via `app.set('authentication', config)` avant l’instanciation de `AuthenticationService`. C’est ce qui rend la cartographie de champs locaux exposée au runtime réellement effective de bout en bout pour `LocalStrategy`.

## Appeler un service protégé

```bash
curl http://localhost:3000/feathers/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Notes de stabilisation

- `users` reste le service de référence pour l’auth embedded
- générer `users` via la CLI
- éviter d’activer `auth` sans service `users` détectable

