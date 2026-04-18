---
editLink: false
---
# Référence CLI

Commande d’entrée :

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

Surface officielle OSS alignée sur la version **6.4.45**.

## Noyau public recommandé

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add file-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

## Commandes secondaires / compatibilité

- `add custom-service <name>`
- `init templates`
- `templates list`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`


## Cibles avancées : quand utiliser `plugin`, `server-module`, `module`, `client-module`, `hook`, `policy`

### Résumé rapide

- `plugin` : plugin serveur Feathers global
- `server-module` : module serveur/infrastructure
- `module` : alias de `server-module`
- `client-module` : plugin Nuxt chargé côté navigateur
- `hook` : logique de hook Feathers réutilisable
- `policy` : règle d'autorisation spécialisée

### Commandes CLI associées

```bash
bunx nuxt-feathers-zod plugins add audit-bootstrap
bunx nuxt-feathers-zod add server-module security-headers
bunx nuxt-feathers-zod add middleware request-logger --target module
bunx nuxt-feathers-zod add middleware api-debug --target client-module
bunx nuxt-feathers-zod add middleware attach-tenant --target hook
bunx nuxt-feathers-zod add middleware is-admin --target policy
```

Pour les exemples détaillés, voir le [Guide CLI](/guide/cli#differences-entre-plugin-server-module-module-client-module-hook-policy).

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

### Services et maintenance de schéma

```bash
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --diff
bunx nuxt-feathers-zod schema users --repair-auth
```

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

### Runtime / Mongo

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

## Notes de stabilité

### `schema <service>` : options à retenir

- `--validate` : vérifie la cohérence manifest ↔ fichiers générés
- `--repair-auth` : restaure la baseline auth-compatible d’un service `users`
- `--diff` : inspecte le drift avant écriture

### `add middleware <name>` : lecture des cibles

- cibles publiques recommandées : `nitro`, `route`
- cibles avancées : `feathers`, `server-module`, `module`, `client-module`, `hook`, `policy`

### Compatibilité historique

`add custom-service <name>` reste accepté, mais la forme recommandée est :

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

La documentation détaillée des flags reste dans le [Guide CLI](/guide/cli).


<!-- release-version: 6.4.48 -->


<!-- release-version: 6.4.49 -->


<!-- release-version: 6.4.56 -->


<!-- release-version: 6.4.121 -->
