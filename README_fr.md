# nuxt-feathers-zod

> Module Nuxt 4 pour FeathersJS v5 (Dove), orienté CLI-first, avec génération de services Zod-first en option.

**Version stable actuelle :** `6.5.29`

- Documentation : `https://vevedh.github.io/nuxt-feathers-zod/`
- Démarrage rapide : `docs/guide/getting-started.md`
- Starter principal : `docs/guide/starter-quasar-unocss-pinia.md`
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
- des helpers côté client pour **Pinia / store session**
- un **starter Quasar + UnoCSS + Pinia** officiel avec MongoDB, auth seedée et RBAC
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
- template starter officiel sous `examples/nfz-quasar-unocss-pinia-starter`
- contrôles de release avec build, typecheck, E2E et smoke tarball

## Starter applicatif principal

Pour une application Nuxt 4 complète avec Quasar 2, UnoCSS, Pinia, MongoDB, auth locale seedée, middleware route, RBAC et couche d’accès Feathers encapsulée :

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

Le starter est documenté dans `docs/guide/starter-quasar-unocss-pinia.md` et maintenu sous `examples/nfz-quasar-unocss-pinia-starter`.


## Parcours application métier Nuxt 4 + Quasar

Pour un portail métier ou un dashboard admin comme Portail COSCA / Portail Comité, le chemin recommandé n’est pas une installation minimale suivie de fichiers de services écrits à la main. Pars du starter officiel Quasar + UnoCSS + Pinia, puis étends-le service par service.

Le guide d’intégration réelle documente maintenant :

- l’alignement complet `nuxt.config.ts` pour NFZ 6.5.x ;
- `nuxt-quasar-ui` plutôt qu’un plugin Quasar manuel ;
- le fichier obligatoire `services/users/users.schema.ts` et la classe runtime `User` ;
- `passwordHash({ strategy: 'local' })` dans le resolver Zod ;
- `userExternalResolver` pour masquer `password` ;
- `useNfzAuth()` comme façade auth UI canonique ;
- les middlewares admin/member et hooks RBAC ;
- la migration des seeds Pinia/localStorage vers des services MongoDB.

À lire :

- Guide intégration réelle : `docs/guide/real-world-nuxt4-quasar-app.md`
- Guide migration : `docs/guide/migrate-existing-nuxt4-app.md`
- Checklist intégration : `docs/guide/real-world-integration-checklist.md`
- Snippets : `examples/real-world-nuxt4-quasar-nfz/snippets/`

## Parcours embedded 5 minutes

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod @pinia/nuxt pinia
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
bun add nuxt-feathers-zod @pinia/nuxt pinia
```

Dépendances Swagger optionnelles :

```bash
bun add feathers-swagger swagger-ui-dist
```

## Liens utiles

- Quick start embedded : `docs/guide/getting-started.md`
- Starter principal Quasar + UnoCSS + Pinia : `docs/guide/starter-quasar-unocss-pinia.md`
- App métier Nuxt 4 + Quasar : `docs/guide/real-world-nuxt4-quasar-app.md`
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


<!-- release-version: 6.5.29 -->
