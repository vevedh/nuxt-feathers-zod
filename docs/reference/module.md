---
editLink: false
---
# Architecture du module

Fichier principal : `src/module.ts`

## Responsabilités

Le module Nuxt est responsable de :

- résoudre les options `feathers` depuis `nuxt.config.ts`
- normaliser la configuration runtime
- détecter le mode `embedded` ou `remote`
- générer les templates dans `.nuxt/feathers/**`
- brancher les plugins client et serveur
- auto-ajouter `@pinia/nuxt` si `feathers.client.pinia` est activé
- exposer une structure cohérente de `runtimeConfig.public._feathers`

## Structure interne

```txt
src/
├─ module.ts
├─ cli/
│  ├─ index.ts
│  ├─ core.ts
│  └─ commands/
├─ runtime/
│  ├─ options/
│  ├─ templates/
│  ├─ services.ts
│  └─ utils/
└─ types/
```

## Cycle de fonctionnement

1. le module lit `nuxt.options` et la clé `feathers`
2. `resolveOptions()` produit la configuration finale
3. le module scanne les services locaux si le mode est `embedded`
4. les templates runtime sont écrits dans `.nuxt/feathers/**`
5. Nuxt charge les plugins générés côté client et côté serveur

## Rôle de `src/runtime/options/**`

Cette couche est la source de vérité des options du module.
Elle fusionne :

- les valeurs par défaut
- `nuxt.config.ts`
- certaines valeurs de `runtimeConfig`

## Rôle de `src/runtime/templates/**`

Cette couche génère le runtime réellement consommé par l'application Nuxt.
Elle écrit notamment :

```txt
.nuxt/feathers/client/**
.nuxt/feathers/server/**
.nuxt/feathers/types/**
```

## Overrides

Le runtime généré peut être surchargé via des templates placés dans :

```txt
feathers/templates
```

avec la configuration `feathers.templates`.
