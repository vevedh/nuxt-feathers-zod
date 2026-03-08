---
editLink: false
---
# CLI

La CLI `bunx nuxt-feathers-zod` est la **méthode officielle** pour initialiser une app Nuxt 4 et générer des artefacts compatibles avec le module.

Elle évite la majorité des dérives classiques :

- `nuxt.config.ts` incomplet,
- `servicesDirs` incohérent,
- auth activée sans service `users`,
- service créé à la main mais non scanné,
- runtime client et runtime public désalignés.

## Commande d’entrée

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Parcours recommandé : nouvelle app Nuxt 4

### Embedded

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

### Embedded + auth locale

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

### Remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Commandes disponibles

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service`
- `add remote-service`
- `add middleware`
- `doctor`

## Règles DX importantes

- **adapter par défaut = `memory`**
- **schema par défaut = `none`**
- **servicesDirs recommandé = `['services']`**
- en embedded, **générer les services via la CLI**
- `add custom-service` reste compatible, mais la forme publique recommandée est :

```bash
bunx nuxt-feathers-zod add service <name> --custom
```

## `init templates`

Initialise un dossier d’override de templates.

```bash
bunx nuxt-feathers-zod init templates
```

Options utiles :

- `--dir <dir>`
- `--force`
- `--dry`

Exemple pour une app Nuxt 4 neuve :

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
```

## `init embedded`

Initialise le mode **embedded** : serveur Feathers dans Nitro.

```bash
bunx nuxt-feathers-zod init embedded --force
```

Flags importants :

- `--framework express|koa`
- `--servicesDir <dir>`
- `--restPath <path>`
- `--websocketPath <path>`
- `--auth true|false`
- `--swagger true|false`
- `--secureDefaults true|false`
- `--cors true|false`
- `--compression true|false`
- `--helmet true|false`
- `--bodyParserJson true|false`
- `--bodyParserUrlencoded true|false`
- `--serveStatic true|false`
- `--serveStaticPath <path>`
- `--serveStaticDir <dir>`
- `--serverModulesPreset <name>`
- `--expressBaseline`
- `--force`
- `--dry`

### Exemple Koa

```bash
bunx nuxt-feathers-zod init embedded --framework koa --force
```

### Exemple Express + auth + Swagger

```bash
bunx nuxt-feathers-zod init embedded --framework express --auth --swagger --force
```

### Exemple Express baseline

```bash
bunx nuxt-feathers-zod init embedded --framework express --expressBaseline --force
```

## `init remote`

Initialise le mode **remote** : client Feathers vers un serveur externe.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
```

Flags importants :

- `--url <http(s)://...>`
- `--transport socketio|rest`
- `--restPath <path>`
- `--websocketPath <path>`
- `--auth true|false`
- `--payloadMode jwt|keycloak`
- `--strategy <name>`
- `--tokenField <name>`
- `--servicePath <path>`
- `--reauth true|false`
- `--force`
- `--dry`

### Exemple REST

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --restPath /api/v1 --force
```

### Exemple remote + payload Keycloak

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## `remote auth keycloak`

Configure le bridge Keycloak côté app.

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId myapp
```

## `add service <name>`

Génère un service embedded.

```bash
bunx nuxt-feathers-zod add service users
```

Options utiles :

- `--adapter memory|mongodb`
- `--schema none|zod|json`
- `--auth true|false`
- `--idField id|_id`
- `--path <servicePath>`
- `--collection <name>`
- `--docs true|false`
- `--servicesDir <dir>`
- `--force`
- `--dry`

### Exemple MongoDB + docs

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --idField _id --docs
```

## `add service <name> --custom`

Génère un service **sans adapter** avec méthodes custom.

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

C’est la forme recommandée pour :

- jobs,
- actions métier,
- opérations d’orchestration,
- endpoints contrôlés.

## `add remote-service <name>`

Ajoute un service client-only dans `feathers.client.remote.services`.

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

## `add middleware <name>`

Génère un artefact middleware.

```bash
bunx nuxt-feathers-zod add middleware auth --target client
```

Cibles supportées :

- `nitro`
- `feathers`
- `server-module`
- `module`

## `doctor`

Diagnostic rapide du projet courant.

```bash
bunx nuxt-feathers-zod doctor
```

À utiliser quand :

- les services ne sont pas détectés,
- l’auth embedded ne résout pas `users`,
- le mode remote semble mal configuré,
- le module compile mais le runtime ne se comporte pas comme prévu.
