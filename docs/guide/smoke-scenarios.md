# Scénarios smoke

Ces scénarios servent de base minimale pour valider le core open source standard.

## 1. Embedded minimal

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service messages
bun dev
```

Attendu : l'application démarre et le service est exposé côté embedded.

## 2. Embedded + auth locale + swagger

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

Attendu : auth locale active et documentation Swagger accessible.

## 3. Remote REST

```bash
bunx nuxi@latest init my-nfz-remote-rest
cd my-nfz-remote-rest
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

## 4. Remote Socket.IO

```bash
bunx nuxi@latest init my-nfz-remote-socket
cd my-nfz-remote-socket
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service messages --path messages --methods find,get,create,patch,remove
bun dev
```

## 5. Service sans adapter avec méthodes custom

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

Attendu : génération du service et des méthodes custom sans utiliser d'adapter de persistance.


## 6. Surface CLI minimale

```bash
bunx nuxt-feathers-zod --help
```

Attendu : la CLI s'affiche sans erreur de parsing Bun/TypeScript.

## 7. Bootstrap MongoDB local

```bash
bunx nuxt-feathers-zod add mongodb-compose
```

Attendu : génération d'un `docker-compose-db.yaml` exploitable pour les tests locaux.
