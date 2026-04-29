---
editLink: false
---
# Référence CLI

> OSS reference snapshot: **v6.5.28**

La CLI `nuxt-feathers-zod` est l’interface officielle pour initialiser un projet, générer les services Feathers, enregistrer les services distants, ajouter les middlewares, activer MongoDB management et diagnostiquer une application NFZ.

## Utilisation

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
# alias
bunx nfz <command> [args] [--flags]
```

## Surface officielle alignée avec le code

| Commande | Rôle |
| --- | --- |
| `init embedded` | Initialise le mode serveur embedded Feathers dans Nuxt/Nitro. |
| `init remote` | Initialise le mode client remote vers une API Feathers externe. |
| `init templates` | Copie les templates surchargeables dans `feathers/templates`. |
| `init starter` | Copie le starter Nuxt 4 + Quasar 2 + UnoCSS + Pinia + NFZ depuis `examples/nfz-quasar-unocss-pinia-starter`. |
| `remote auth keycloak` | Configure le mode remote avec payload Keycloak. |
| `add service <name>` | Génère un service embedded adapter memory/mongodb. |
| `add service <name> --custom` | Génère un service adapter-less avec méthodes custom. |
| `add file-service <name>` | Génère un service local upload/download. |
| `add remote-service <name>` | Enregistre un service distant côté client. |
| `add middleware <name>` | Génère un middleware ou artefact associé. |
| `add server-module <name>` | Génère un module serveur embedded avancé. |
| `add mongodb-compose` | Génère `docker-compose-db.yaml` pour MongoDB. |
| `mongo management` | Active ou met à jour les routes MongoDB management. |
| `schema <service>` | Inspecte, valide ou répare le schéma d’un service. |
| `auth service <name>` | Active ou désactive les hooks JWT sur un service. |
| `doctor` | Diagnostique la configuration du projet. |

## Exemples recommandés

### Projet embedded minimal

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod @pinia/nuxt pinia
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users --auth --schema zod
bun dev
```

### Starter Quasar + UnoCSS + Pinia

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

### Projet embedded MongoDB

```bash
bunx nuxt-feathers-zod add mongodb-compose --port 27017 --database app
bunx nuxt-feathers-zod init embedded --force --auth
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --schema zod
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

### Projet remote

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --auth true
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

### Remote + Keycloak

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId myapp
```

## Options principales

### `init embedded`

```bash
bunx nuxt-feathers-zod init embedded \
  --framework express \
  --servicesDir services \
  --restPath /feathers \
  --websocketPath /socket.io \
  --auth true \
  --swagger false \
  --force
```

Flags importants :

- `--framework express|koa`
- `--servicesDir <dir>`
- `--restPath <path>`
- `--websocketPath <path>`
- `--secureDefaults true|false`
- `--cors true|false`
- `--compression true|false`
- `--helmet true|false`
- `--bodyParserJson true|false`
- `--bodyParserUrlencoded true|false`
- `--serveStatic true|false`
- `--serverModulesPreset express-baseline`
- `--auth true|false`
- `--swagger true|false`

### `init remote`

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --restPath /feathers \
  --websocketPath /socket.io \
  --auth true \
  --payloadMode jwt
```

Flags importants :

- `--url <http(s)://...>`, requis
- `--transport socketio|rest|auto`, défaut CLI : `socketio`
- `--restPath <path>`
- `--websocketPath <path>`
- `--auth true|false`
- `--payloadMode jwt|keycloak`
- `--strategy jwt`
- `--tokenField accessToken`
- `--servicePath authentication`
- `--reauth true|false`

### `add service <name>`

```bash
bunx nuxt-feathers-zod add service messages --schema zod
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview --schema zod
```

Règles alignées avec le code :

- `--methods` et `--customMethods` sont acceptés uniquement avec `--custom`.
- `--collection` exige `--adapter mongodb`.
- `--idField` est ignoré/interdit pour les services adapter-less.
- Le service généré met à jour `services/.nfz/manifest.json`.

### `add file-service <name>`

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets --auth true
```

Le template partagé généré utilise désormais `runtimeConfig.public._feathers`, pas `runtimeConfig.public.feathers`, pour résoudre le fallback REST.

### `mongo management`

```bash
bunx nuxt-feathers-zod mongo management \
  --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin \
  --auth false \
  --basePath /mongo
```

## Builder API runtime

Depuis la 6.5.26, la documentation, le code runtime et le contrat public Builder sont alignés sur :

- `GET /api/nfz/services`
- `GET /api/nfz/manifest`
- `POST /api/nfz/manifest`
- `GET /api/nfz/schema?service=<name>`
- `POST /api/nfz/schema`
- `POST /api/nfz/preview`
- `POST /api/nfz/apply`

Les routes historiques restent compatibles :

- `GET /api/nfz/schema/:service`
- `POST /api/nfz/schema/:service`

## RuntimeConfig officiel

Le runtime doit lire :

```ts
const serverConfig = useRuntimeConfig()._feathers
const publicConfig = useRuntimeConfig().public._feathers
```

À ne plus utiliser dans les nouveaux fichiers :

```ts
useRuntimeConfig().feathers
useRuntimeConfig().public.feathers
```

<!-- release-version: 6.5.28 -->
