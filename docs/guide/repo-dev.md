# Flux de développement du dépôt

Utilise ce flux quand tu travailles **dans le dépôt `nuxt-feathers-zod` lui-même**.

## Nettoyage et installation sûrs

```bash
bun run clean:repo
bun install
```

Évite de commencer par `bunx nuxi cleanup` dans le dépôt du module. Avant l’installation des dépendances, `nuxi` peut échouer car `@nuxt/kit` n’est pas encore disponible.

## Vérifications après installation

```bash
bun run repo:doctor
bun run cli:build
bun run module:build
```

## Métadonnées CLI dans `dist/cli`

L’étape `module:build` ne doit plus afficher de warning au sujet de `dist/cli/index.mjs` maintenant que les binaires publiés sont des wrappers versionnés sous `bin/`. Le contrat supporté reste la séquence finale :

```bash
bun run cli:build
bun run sanity:cli-dist-meta
```

Si `sanity:cli-dist-meta` passe, l’artefact CLI final est dans l’état attendu.
