---
editLink: false
---
# Getting started

`nuxt-feathers-zod` gives you a **Nuxt 4 + Feathers v5** workflow without manually re-gluing server, client and generation pieces.

If you are new to the module, keep this simple split in mind:

- **embedded** → Feathers runs inside your Nuxt/Nitro app
- **remote** → Nuxt consumes an external Feathers API

## Pick your path

### 1. I want to understand NFZ quickly
Use the **minimal embedded** path.

### 2. I want a baseline with local authentication
Use **embedded + auth**.

### 3. I already have an external Feathers API
Use **remote**.

### 4. I want a local file upload/download starter
Use `add file-service` directly.

## Shortest supported path

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Prerequisites

- **Bun** recommended
- **Node.js 18+**
- **Nuxt 4**

## Rules to follow from day one

1. **Initialize the module before creating services.**
2. **Generate services through the CLI.**
3. **Keep `feathers.servicesDirs = ['services']` at first.**
4. **Do not hand-create your first service if you want the supported path.**

These rules avoid most scan, export, auth entity and hook mismatch issues.

---

## Path #1 — Minimal embedded mode

### Install the module

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Optional legacy Swagger docs:

```bash
bun add feathers-swagger swagger-ui-dist
```

### Initialize embedded mode

```bash
bunx nuxt-feathers-zod init embedded --force
```

### Generate a first service

```bash
bunx nuxt-feathers-zod add service users
```

### Start the app

```bash
bun run dev
```

### Quick check

- `GET http://localhost:3000/feathers/users`
- `POST http://localhost:3000/feathers/users`

---

## Path #2 — Embedded with local auth

### Initialize embedded + auth

```bash
bunx nuxt-feathers-zod init embedded --force --auth
```

### Generate the auth entity service

```bash
bunx nuxt-feathers-zod add service users --auth
```

MongoDB version:

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id --auth --docs
```

> **MongoDB note** — when using `--adapter mongodb`, a MongoDB instance must already be reachable. You can generate a `docker-compose.yaml` with `bunx nuxt-feathers-zod add mongodb-compose`.

### Typical endpoints

- `POST /feathers/authentication`
- `GET /feathers/users`

---

## Path #3 — Remote mode

### Initialize remote mode

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio
```

REST version:

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest
```

### Register the remote services

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod add remote-service articles --path articles --methods find,get
```

> In remote mode, `feathers.templates.dirs` stays optional. You only need it if you want to override client templates.

---

## Path #4 — File upload/download starter

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

Dedicated guide: [File upload/download](/en/guide/file-upload-download)

---

## Recommended checks inside the module repository

If you are working on NFZ itself:

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Where to go next

- [Embedded / remote modes](/en/guide/modes)
- [Services (Zod-first)](/en/guide/services)
- [Local auth](/en/guide/auth-local)
- [Keycloak SSO](/en/guide/keycloak-sso)
- [npm & Git publishing](/en/guide/publishing)
