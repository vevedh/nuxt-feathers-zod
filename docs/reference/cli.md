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
- `add server-module <name>`
- `add mongodb-compose`
- `auth service <name>`
- `doctor`

## Exemples de référence

### Vérification minimale

```bash
bunx nuxt-feathers-zod --help
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

### Bootstrap MongoDB local

```bash
bunx nuxt-feathers-zod add mongodb-compose
```

### Basculer les hooks auth d’un service

```bash
bunx nuxt-feathers-zod auth service users --enabled true
```

## Compatibilité historique

`add custom-service <name>` reste accepté, mais la forme recommandée est :

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

## Génération auth-aware de `users`

`add service users --auth` supporte désormais un flag explicite `--authAware true|false`.

Comportement attendu :

- `--auth` = protection JWT du service
- `--authAware` = sémantique hash/masquage du mot de passe pour l’auth locale
- par défaut avec `users --auth` = mode auth-aware activé sauf désactivation explicite

Exemples de référence :

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```
