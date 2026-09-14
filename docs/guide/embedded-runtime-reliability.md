---
editLink: false
---
# Fiabilité du runtime embedded

NFZ 6.7.2 renforce le démarrage embedded lorsque Nuxt 4 et Nitro montent Feathers sous `/feathers` avec Express.

## Une seule source métier

Utilise `servicesDirs` comme source principale d'enregistrement :

```ts
export default defineNuxtConfig({
  feathers: {
    servicesDirs: ['services'],
    server: {
      loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'],
      duplicateServicePolicy: 'error',
    },
  },
})
```

N'importe pas à nouveau ces registrars depuis un agrégateur placé dans `server/feathers/plugins`. Le doctor signale désormais ce mélange de phases et échoue si des services sont découverts alors que `loadOrder` omet `services`.

## Bootstrap idempotent

Une instance suit le cycle :

```text
absent -> initializing -> ready
                     \-> failed
```

Le verrou est acquis avant la création de l'application Feathers. Deux invocations concurrentes attendent la même promesse ; une invocation après `ready` retourne sans rejouer plugins, services, modules, routeurs ou hooks.

L'état `failed` reste consultable avec un `causeId` sûr. Le message d'erreur original n'est jamais envoyé au navigateur.

## Doublons de services

La politique par défaut est fail-closed :

```ts
server: {
  duplicateServicePolicy: 'error',
}
```

Le diagnostic contient le chemin Feathers et les deux sources :

```text
[nuxt-feathers-zod] Duplicate service registration: application-catalog
first: services/application-catalog/application-catalog.ts
second: server/feathers/plugins/traefik-services.ts
```

`skip` est réservé aux migrations explicites ; le premier service est conservé et le registrar ignoré apparaît dans `nfz/status`.

## Pont REST Express

Le handler couvre `/feathers`, `/feathers/` et `/feathers/**` :

- initialisation en cours : `503` JSON et `Retry-After: 1` ;
- bootstrap échoué : `503` JSON avec `causeId` ;
- runtime prêt, service absent : `404` Feathers JSON ;
- aucune erreur NFZ n'est remplacée par la page HTML 404 de Nuxt.

Le pont restaure toujours `req.url` et `req.originalUrl`, retire ses listeners `finish`/`close` et est compilé avec `strict` et `noImplicitAny`.

## Frontière Zod

NFZ 6.7.x supporte **Zod 3** comme peer runtime partagé :

```json
{
  "dependencies": {
    "zod": "3.25.76"
  }
}
```

Les schémas applicatifs, `zodQuerySyntax()` et `getZodValidator()` doivent résoudre le même runtime. `doctor` affiche la version, les chemins actifs, le nombre de copies détectées et échoue sur Zod 4 ou sur deux runtimes actifs distincts.

## Validation

```bash
bunx nuxt-feathers-zod doctor
bun run typecheck
bun run build
```

Le package valide aussi son starter principal après empaquetage, sur un serveur Nitro de production, avec authentification et CRUD REST Express réel.

<!-- release-version: 6.7.45 -->
