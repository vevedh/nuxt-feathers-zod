---
editLink: false
---
# Dépannage

Cette page remplace l’ancien contenu de maintien de navigation par une explication opérationnelle de la méthode de diagnostic des erreurs Nuxt, Bun, Vite, Feathers et NFZ. Elle est destinée aux développeurs qui veulent comprendre l’option, l’activer dans `nuxt.config.ts` et vérifier son comportement dans un projet Nuxt 4.

## Objectif

Cette option ou fonctionnalité permet de garder une architecture cohérente entre le module Nuxt, le runtime Feathers, les services générés, le client TypeScript et le CLI. L’exemple ci-dessous donne une base directement réutilisable.

## Quand utiliser cette option ?

Utilise cette page lorsque tu veux :

- configurer précisément la méthode de diagnostic des erreurs Nuxt, Bun, Vite, Feathers et NFZ ;
- documenter le choix dans un starter ou une application ;
- tester rapidement le comportement avec une commande CLI ;
- éviter les divergences entre configuration, fichiers générés et runtime.

## Exemple de configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],
    client: true,
    transports: {
      rest: { path: '/feathers' },
      websocket: false,
    },
  }
})
```

## Exemple CLI

```bash
bunx nuxt-feathers-zod doctor
bun run clean:repo
```

### `nuxi requires @nuxt/kit` après extraction

Cette erreur apparaît lorsque `nuxi` est lancé avant l’installation locale des dépendances. Utilise l’ordre suivant :

```powershell
bun install --frozen-lockfile
bun run clean:repo
bun run typecheck
bun run dev
```

Le script `clean:repo` ne charge pas Nuxt. Il reste donc utilisable même quand `.nuxt`, `.output` ou les caches Vite doivent être supprimés.

### `spawnSync bun ENOENT` pendant `bun install`

Depuis la version 6.5.35, le build du CLI utilise directement `Bun.build()` dans le processus Bun déjà actif. Aucun second exécutable `bun` n’est recherché dans le `PATH` Windows.

### Code de sortie `58` après le démarrage du playground

Le projet exige désormais Bun `>=1.3.6`. Mets d’abord Bun à niveau avec `bun upgrade`, puis vérifie la version avec `bun --version`.

Le script `bun run dev` ne passe plus par le shim Windows `nuxi` de Bun. `scripts/run-playground.mjs` charge directement le CLI local `@nuxt/cli/cli` dans un processus Node.js, sans créer de processus enfant. Cette voie réduit les problèmes de cycle de vie signalés avec les serveurs Vite de longue durée sous Windows.

Si Nitro est construit et que le serveur Feathers annonce MongoDB prêt, l’initialisation applicative a réussi. Le pré-bundling de `socket.io-client` évite en plus sa découverte tardive et le redémarrage Vite associé.

## Exemple d’utilisation

```ts
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```

## Points de vigilance

- Les chemins exposés (`/feathers`, `/feathers/nfz/*`, `/socket.io`, `/mongo`) et les éventuelles façades `/api/nfz/*` doivent être documentés dans le projet applicatif.
- Les options qui exposent une surface d’administration doivent être protégées avant un déploiement hors local.
- Les services générés par le CLI restent préférables aux services écrits manuellement pour conserver le manifest, les types et les hooks.

## Bonnes pratiques

- Lance `bunx nuxt-feathers-zod doctor` après la modification.
- Utilise `--dry` avant les commandes qui écrivent dans le projet.
- Versionne les fichiers générés importants et documente toute option non standard.
- Teste un appel REST minimal avant de diagnostiquer le frontend.

<!-- release-version: 6.5.49 -->
