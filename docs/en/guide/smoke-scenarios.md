# Smoke scenarios

These scenarios are the minimum baseline used to validate the standard open-source core.

## 1. Minimal embedded mode

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

Expected: the app starts and the embedded service is available.

## 2. Embedded + local auth + swagger

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

Expected: local auth is active and Swagger docs are available.

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

## 5. Adapter-less service with custom methods

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

Expected: the service and its custom methods are generated without using a persistence adapter.
