---
editLink: false
---
# Server modules

Cette page remplace l’ancien contenu de maintien de navigation par une explication opérationnelle de l’option `server.modules` pour les middlewares HTTP embedded. Elle est destinée aux développeurs qui veulent comprendre l’option, l’activer dans `nuxt.config.ts` et vérifier son comportement dans un projet Nuxt 4.

## Objectif

Cette option ou fonctionnalité permet de garder une architecture cohérente entre le module Nuxt, le runtime Feathers, les services générés, le client TypeScript et le CLI. L’exemple ci-dessous donne une base directement réutilisable.

## Quand utiliser cette option ?

Utilise cette page lorsque tu veux :

- configurer précisément l’option `server.modules` pour les middlewares HTTP embedded ;
- documenter le choix dans un starter ou une application ;
- tester rapidement le comportement avec une commande CLI ;
- éviter les divergences entre configuration, fichiers générés et runtime.

## Exemple de configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    server: {
      modules: [
        'helmet',
        { src: 'rate-limit', options: { windowMs: 60_000, max: 120 } },
      ],
      loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'],
    },
  }
})
```

## Exemple CLI

```bash
bunx nuxt-feathers-zod add server-module rate-limit --preset rate-limit --force
```

## Exemple d’utilisation

```ts
// server/feathers/modules/request-logger.ts
export default function requestLogger(app: any) {
  app.use(async (ctx: any, next: () => Promise<void>) => {
    console.info(ctx.method, ctx.url)
    await next()
  })
}
```

## Points de vigilance

- Les chemins exposés (`/feathers`, `/socket.io`, `/mongo`, `/api/nfz`) doivent être documentés dans le projet applicatif.
- Les options qui exposent une surface d’administration doivent être protégées avant un déploiement hors local.
- Les services générés par le CLI restent préférables aux services écrits manuellement pour conserver le manifest, les types et les hooks.

## Bonnes pratiques

- Lance `bunx nuxt-feathers-zod doctor` après la modification.
- Utilise `--dry` avant les commandes qui écrivent dans le projet.
- Versionne les fichiers générés importants et documente toute option non standard.
- Teste un appel REST minimal avant de diagnostiquer le frontend.

<!-- release-version: 6.5.23 -->
