---
editLink: false
---
# Démarrage rapide

`nuxt-feathers-zod` te permet de partir sur un workflow **Nuxt 4 + Feathers v5** sans recoller manuellement les briques serveur, client et génération.

Si tu débutes, retiens cette idée simple :

- **embedded** → Feathers tourne dans ton app Nuxt/Nitro
- **remote** → Nuxt consomme une API Feathers externe

## Choisis ton parcours

### 1. Je veux découvrir NFZ le plus vite possible
Utilise le parcours **embedded minimal**.

### 2. Je veux un socle avec authentification locale
Pars sur **embedded + auth**.

### 3. J’ai déjà une API Feathers externe
Pars sur **remote**.

### 4. Je veux un starter upload/download de fichiers
Utilise directement le scaffold `add file-service`.

## Parcours le plus court

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Pré-requis

- **Bun** recommandé
- **Node.js 18+**
- **Nuxt 4**

## Règles à suivre dès le début

1. **Initialise le module avant de créer des services.**
2. **Génère les services via la CLI.**
3. **Garde `feathers.servicesDirs = ['services']` au début.**
4. **Ne pars pas d’un service écrit à la main pour ton premier test.**

Ces règles évitent la majorité des problèmes de scan, d’exports, d’entité auth et de hooks incohérents.

---

## Parcours n°1 — Embedded minimal

### Installer le module

```bash
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
```

Swagger legacy optionnel :

```bash
bun add feathers-swagger swagger-ui-dist
```

### Initialiser le mode embedded

```bash
bunx nuxt-feathers-zod init embedded --force
```

### Générer un premier service

```bash
bunx nuxt-feathers-zod add service users
```

### Démarrer

```bash
bun run dev
```

### Tester rapidement

- `GET http://localhost:3000/feathers/users`
- `POST http://localhost:3000/feathers/users`

---

## Parcours n°2 — Embedded avec auth locale

### Initialiser embedded + auth

```bash
bunx nuxt-feathers-zod init embedded --force --auth
```

### Générer le service entité d’auth

```bash
bunx nuxt-feathers-zod add service users --auth
```

Version MongoDB :

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id --auth --docs
```

> **Note MongoDB** — quand tu utilises `--adapter mongodb`, la base MongoDB doit déjà être disponible. Tu peux générer un `docker-compose.yaml` avec `bunx nuxt-feathers-zod add mongodb-compose`.

### Endpoints typiques

- `POST /feathers/authentication`
- `GET /feathers/users`

---

## Parcours n°3 — Remote

### Initialiser le mode remote

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio
```

Version REST :

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest
```

### Déclarer les services distants

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod add remote-service articles --path articles --methods find,get
```

> En mode remote, `feathers.templates.dirs` est optionnel. Il ne sert que si tu veux surcharger des templates client.

---

## Parcours n°4 — Upload/download de fichiers

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

Guide dédié : [Upload/download de fichiers](/guide/file-upload-download)

---

## Vérifications recommandées dans le dépôt du module

Si tu travailles sur NFZ lui-même :

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Où aller ensuite

- [Modes embedded / remote](/guide/modes)
- [Services (Zod-first)](/guide/services)
- [Auth locale](/guide/auth-local)
- [Keycloak SSO](/guide/keycloak-sso)
- [Publication npm & Git](/guide/publishing)
