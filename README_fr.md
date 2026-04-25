# nuxt-feathers-zod

> Module Nuxt 4 pour FeathersJS v5 (Dove), orienté CLI-first, avec génération de services Zod-first en option.

**Version stable actuelle :** `6.5.1`

- Documentation : `https://vevedh.github.io/nuxt-feathers-zod/`
- Démarrage rapide : `docs/guide/getting-started.md`
- Référence CLI : `docs/reference/cli.md`
- Workflow communautaire : `docs/guide/community-workflow.md`
- Discipline de release : `RELEASE_CHECKLIST.md`

## Ce que c’est

`nuxt-feathers-zod` aide à construire ou consommer un backend FeathersJS depuis une application Nuxt 4 avec un workflow cohérent module + CLI.

Le module supporte deux modes principaux :

- **embedded** — un serveur Feathers tourne dans Nuxt/Nitro
- **remote** — une application Nuxt utilise un client Feathers typé vers une API externe

## À quoi il sert

NFZ est adapté si tu veux :

- une **architecture backend-first native à Nuxt**
- des services Feathers générés par une **CLI déterministe**
- des types partagés et des schémas **Zod-first** en option
- des flux **auth locale/JWT** ou une intégration **Keycloak SSO**
- des helpers côté client pour **Pinia / feathers-pinia**
- un chemin vers la **gestion MongoDB**, les diagnostics et le builder tooling

## Ce que le module OSS inclut

- intégration Nuxt 4 + Nitro
- modes embedded et remote
- transports REST et Socket.IO
- serveur embedded avec Express ou Koa
- bootstrap CLI pour projets embedded et remote
- génération CLI pour services, services distants, middlewares et server modules
- modes de schéma `none | zod | json`
- auth locale/JWT
- pont Keycloak pour le mode remote
- support Swagger legacy optionnel
- template overrides
- surface optionnelle de gestion MongoDB via `database.mongo.management`
- contrôles de release avec build, typecheck, E2E et smoke tarball

## Parcours 5 minutes

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

## Règles recommandées

1. **Initialise d’abord le module.**
2. **Génère les services via la CLI.**
3. **Ne crée pas à la main les premiers fichiers de service.**
4. **Garde `feathers.servicesDirs = ['services']` sauf raison documentée.**

Ces quatre règles évitent la plupart des problèmes de scan, d’entité auth et d’exports incohérents.

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Dépendances Swagger optionnelles :

```bash
bun add feathers-swagger swagger-ui-dist
```

## Liens utiles

- Quick start embedded : `docs/guide/getting-started.md`
- Mode remote : `docs/guide/remote.md`
- Auth locale : `docs/guide/auth-local.md`
- Keycloak SSO : `docs/guide/keycloak-sso.md`
- Starter upload/download : `docs/guide/file-upload-download.md`
- Dépannage : `docs/guide/troubleshooting.md`
- Workflow de publication : `docs/guide/publishing.md`

## Workflow du dépôt

Le dépôt est maintenant organisé autour du code public, de la documentation, des tests et de l’outillage de release.
Les notes historiques du mainteneur sont déplacées dans `archives/`.

Fichiers racine utiles :

- `CONTRIBUTING.md`
- `RELEASE_CHECKLIST.md`
- `REPO_DEV.md`

## Contrôles recommandés avant publication

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Licence

MIT
