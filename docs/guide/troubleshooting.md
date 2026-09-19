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

### `EPERM: Operation not permitted (NtSetInformationFile)` pendant `bun install`

Cette erreur Windows peut interrompre l’extraction vers le cache partagé de Bun et laisser `node_modules` incomplet. Les erreurs suivantes (`Cannot find module 'lodash.merge'`, `human-signals`, etc.) sont alors des conséquences de l’installation interrompue, pas des défauts indépendants du module.

Ferme d’abord les serveurs Nuxt/Vite, Vitest, Playwright et les processus Node/Bun qui utilisent le dossier. Lance ensuite une seule gate :

```powershell
bun run verify:windows
```

`verify:windows` contrôle ou installe automatiquement les dépendances. Sous Windows, le cache par défaut est placé dans `%LOCALAPPDATA%/nuxt-feathers-zod/bun-install-cache`, donc les téléchargements valides sont réutilisés entre deux dossiers de versions extraits. L’installateur nettoie uniquement l’arbre `node_modules` incomplet et les entrées temporaires, désactive les scripts de cycle de vie pendant l’extraction afin qu’un `postinstall` ne s’exécute jamais sur un arbre partiel, puis réduit la concurrence réseau de 8 à 2 puis 1 lorsqu’un verrouillage `NtSetInformationFile` est détecté.

Si les tentatives sur le cache partagé restent bloquées, une dernière installation de secours utilise un cache temporaire isolé, une concurrence réseau de 1 et le mode Bun `--no-cache` pour éviter le cache de manifestes. Les scripts NFZ de préparation, build et validation sont exécutés explicitement plus tard par la gate, après vérification complète des dépendances. Après une installation vérifiée, un fingerprint de `package.json`, `bun.lock`, de la version Bun et de la stratégie d’installation évite une réinstallation identique.

Pour la chaîne de release complète, copie d’abord le modèle local non versionné :

```powershell
Copy-Item .env.release.example .env.release.local
bun run verify:release:windows
```

La gate charge automatiquement `.env.release.local` lorsque `MONGODB_URL` n’est pas déjà défini dans le processus. Une variable d’environnement explicite reste prioritaire sur le fichier local.

Si tu as déjà exécuté `bun run install:windows`, la gate complète détecte l’installation vérifiée et la réutilise. Le mode explicite suivant refuse toute réinstallation et échoue si l’état ne correspond plus au lockfile :

```powershell
bun run verify:release:windows:skip-install
```

Avant les tests longs d'une release complète, la gate vérifie désormais que le **serveur Docker** répond réellement. Le contrôle échoue immédiatement si Docker Desktop/Engine n'est pas démarré, au lieu d'attendre les certifications PostgreSQL/MySQL/MariaDB/MSSQL et la matrice multi-base. Les hôtes particulièrement lents peuvent ajuster `NFZ_RELEASE_DOCKER_PREFLIGHT_TIMEOUT_MS` et `NFZ_RELEASE_DOCKER_PREFLIGHT_ATTEMPTS`.

Si une panne externe survient **après** la création du candidate immutable, ne recrée pas le tarball et ne rejoue pas les gates source/docs/browser. Après correction de l'environnement, utilise :

```powershell
bun run verify:release:windows:resume
```

Ce mode vérifie le SHA du candidate existant, réutilise uniquement les stamps qui correspondent exactement à ce SHA, exécute dans l'ordre les validations absentes ou périmées puis appelle `release:finalize`. Il s'agit d'un outil de reprise ; la certification de référence reste un `bun run verify:release:windows` complet.

Les consumers exact-candidate PostgreSQL/MySQL/MariaDB/SQLite/MSSQL et la matrice multi-base utilisent désormais Bun pour matérialiser leurs dépendances. Ces fixtures base de données ne sont pas des tests d'application Nuxt : Bun est donc lancé avec `--omit=peer`, conserve les scripts lifecycle désactivés, utilise le backend `copyfile` et le linker hoisted, puis repart d'un workspace propre avec une concurrence réseau réduite de 8 à 2 en cas de retry. Le package temporaire garde Zod 3.25.76 explicite et force toute la famille FeathersJS certifiée sur 5.0.49 via les overrides, tandis que le consumer npm propre séparé reste responsable de valider le contrat peer Nuxt publié. Le plafond reste de **15 minutes par tentative** avec **2 tentatives**. Sur un hôte particulièrement lent, ajuste `NFZ_RELEASE_CONSUMER_INSTALL_TIMEOUT_MS`, `NFZ_RELEASE_CONSUMER_INSTALL_ATTEMPTS` ou `NFZ_RELEASE_CONSUMER_NETWORK_CONCURRENCY` plutôt que de modifier les scripts de certification.

Le cache peut être placé hors du projet avec `NFZ_WINDOWS_CACHE_DIR`. Utilise `bun run install:windows -- --force` uniquement pour imposer une réinstallation propre. Évite de séparer les gates avec `;` dans PowerShell : les commandes suivantes continuent même si l’installation échoue et produisent alors des diagnostics secondaires trompeurs.

Les builds VitePress publics et privés utilisent une installation distincte. Sous Windows, leur cache partagé se trouve par défaut dans `%LOCALAPPDATA%/nuxt-feathers-zod/bun-docs-cache`. Le runner applique les mêmes protections : scripts de cycle de vie désactivés, reprises 8 → 2 → 1, puis une tentative isolée avec `--no-cache`. Une installation VitePress vérifiée est mémorisée et réutilisée. Pour déplacer uniquement ce cache, définis `NFZ_DOCS_CACHE_DIR`.

L’installation VitePress est vérifiée statiquement à partir de `package.json`, du binaire publié et de la version exacte inscrite dans `bun.lock` ; le runner ne lance plus `vitepress --version` pour valider l’installation. Le build réel est ensuite exécuté avec Node.js. Pendant un build long, le runner affiche un heartbeat afin de confirmer que le processus travaille toujours. Le probe Bun reste limité à 20 secondes et le build à 15 minutes par défaut. Un processus qui dépasse cette limite est arrêté avec tout son arbre enfant, puis la gate rend la main avec une erreur explicite. Les valeurs peuvent être adaptées avec `NFZ_DOCS_PROBE_TIMEOUT_MS`, `NFZ_DOCS_BUILD_TIMEOUT_MS` et `NFZ_DOCS_HEARTBEAT_MS`.

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

<!-- release-version: 6.8.0 -->
