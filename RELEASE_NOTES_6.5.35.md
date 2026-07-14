# nuxt-feathers-zod 6.5.35

Cette version corrige le parcours d’installation et de développement sous Windows sans modifier les contrats runtime, les services Feathers ni la configuration de l’instance `default`.

## Build CLI fiable sous Windows

Le script de build du CLI n’ouvre plus un processus Node.js chargé de rechercher un second exécutable `bun` dans le `PATH`. Il s’exécute maintenant avec Bun et appelle directement l’API `Bun.build()`.

Cette modification supprime l’échec `spawnSync bun ENOENT` observé pendant le hook `prepare` de `bun install`, tout en conservant le code splitting ESM, les noms de chunks et les budgets de bundle introduits en 6.5.34.

## Nettoyage sans dépendance Nuxt

La commande `bun run clean:repo` couvre désormais les sorties `.nuxt`, `.nitro`, `.output`, `dist` ainsi que les caches Vite du dépôt et du playground. Elle repose uniquement sur les API de fichiers de Node.js et peut être utilisée sans charger `@nuxt/kit`.

Le nouveau raccourci `bun run dev:fresh` exécute une installation figée, le nettoyage, le typecheck puis le démarrage du playground dans le bon ordre.

## Démarrage du playground

Le démarrage et le build du playground passent maintenant par `scripts/run-playground.mjs`. Ce script charge l’entrée locale `@nuxt/cli/cli` dans le processus Node.js courant, sans shim global et sans processus enfant. Il évite ainsi la résolution du mauvais `nuxi` et réduit les erreurs de cycle de vie Windows observées avec les processus Vite de longue durée.

`socket.io-client` est ajouté à `vite.optimizeDeps.include`. Vite n’a plus besoin de découvrir cette dépendance au premier chargement du client Feathers généré, ce qui évite le rechargement de page et le redémarrage de pré-bundling observés sous Windows.

La version minimale de Bun est alignée sur `1.3.6`. Une installation plus ancienne doit être mise à niveau avec `bun upgrade` avant de relancer les validations.

## Documentation et tests

Les procédures de dépannage françaises et anglaises expliquent désormais l’ordre d’installation correct, la différence entre `clean:repo` et `nuxi cleanup`, ainsi que l’interprétation du code de sortie Windows après un arrêt du serveur de développement.

Les tests d’intégration vérifient que le build CLI utilise l’API Bun sans `spawnSync`, que le script npm invoque bien Bun et que le playground pré-bundle Socket.IO.

Le contrôle `sanity:windows-tooling` protège ces invariants pendant `prepare`, `prepack` et la release. Le script `bun run verify:windows` rejoue l’installation, le nettoyage, le typecheck, les tests et le build dans PowerShell.
