---
editLink: false
---
# Doctor

La commande `doctor` vérifie la cohérence entre la configuration Nuxt, la découverte embedded, les phases de bootstrap et la frontière Zod.

```bash
bunx nuxt-feathers-zod doctor
```

## Diagnostic embedded

Pour chaque projet, le doctor affiche notamment :

```text
services discovered: 8
service traefik-routes: services/traefik-routes/traefik-routes.ts
plugins discovered: 0
server.loadOrder: modules:pre -> plugins -> services -> modules:post
```

Il échoue lorsque :

- `servicesDirs` découvre des services mais `loadOrder` ne contient pas `services` ;
- un plugin importe manuellement un registrar déjà découvert ;
- l'application déclare ou résout Zod 4 ;
- les schémas applicatifs et les validateurs NFZ utilisent deux runtimes Zod actifs différents.

## Diagnostic Zod

La sortie expose sans secret :

```text
zod declared range: 3.25.76
zod installed copies: 1
zod application runtime: 3.25.76 (.../zod/package.json)
zod NFZ validator runtime: 3.25.76 (.../zod/package.json)
zod compatibility: compatible
```

Une copie Zod transitive n'est pas automatiquement bloquante. Le doctor contrôle les runtimes réellement résolus par l'application et NFZ.

## Après une modification structurelle

```bash
bunx nuxt-feathers-zod doctor
bun run typecheck
bun run build
```

Conserve `servicesDirs` comme source métier unique et le `loadOrder` standard. Les plugins restent réservés à l'infrastructure transversale.

<!-- release-version: 6.7.45 -->
