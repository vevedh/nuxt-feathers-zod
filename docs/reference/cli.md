---
editLink: false
---
# Référence CLI

Commande d’entrée :

```bash
bunx nuxt-feathers-zod
```

## Commandes supportées dans le core open source

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `add middleware <name>`
- `doctor`

## Exemples de référence

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

## Compatibilité historique

`add custom-service <name>` reste accepté, mais la forme recommandée est :

```bash
bunx nuxt-feathers-zod add service <name> --custom
```
