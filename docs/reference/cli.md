---
editLink: false
---
# Référence CLI

Commande d’entrée :

```bash
bunx nuxt-feathers-zod
```

Surface officielle OSS alignée sur la version **6.3.6**.

## Catalogue des commandes

### Initialisation

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`

### Services

- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `auth service <name>`
- `schema <service>`

### Runtime / Mongo

- `add middleware <name>`
- `add server-module <name>`
- `add mongodb-compose`
- `mongo management`

### Helpers OSS

- `templates list`
- `plugins list`
- `plugins add <name>`
- `modules list`
- `modules add <name>`
- `middlewares list`
- `middlewares add <name>`

### Diagnostic

- `doctor`

## Exemples de référence

### Vérification minimale

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod doctor
```

### Nouvelle app embedded

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

### Nouvelle app remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

### Services et schéma

```bash
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field title:string!
```

### Runtime / Mongo

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

### Helpers OSS

```bash
bunx nuxt-feathers-zod templates list
bunx nuxt-feathers-zod plugins add audit-log
bunx nuxt-feathers-zod modules add security-headers --preset security-headers
bunx nuxt-feathers-zod middlewares add request-id --target nitro
```

## Notes de stabilité

- `add custom-service <name>` reste accepté, mais la forme recommandée est :

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

- `doctor` reporte désormais aussi l’état de Mongo management.
- En remote, `transport: auto` résout vers `socketio` dans le runtime OSS actuel.
- La documentation détaillée des flags reste dans [Guide CLI](/guide/cli).
