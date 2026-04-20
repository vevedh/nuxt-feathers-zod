# Dossier de soumission Nuxt — nuxt-feathers-zod

Date: 2026-04-20
Base auditée: archive `nuxt-feathers-zod-main.zip` (snapshot interne du repo)

## 1. Objectif

Objectif court terme: rendre `nuxt-feathers-zod` prêt pour un **listing communautaire sur `nuxt.com/modules`**.

Objectif moyen terme: candidater plus tard à `nuxt-modules` / `@nuxtjs` si la traction, la stabilité et la DX deviennent suffisamment fortes.

## 2. Verdict rapide

Statut recommandé: **GO avec correctifs avant soumission**.

Le module est déjà proche du niveau requis:
- module Nuxt défini proprement
- `configKey` clair
- compatibilité Nuxt déclarée
- TypeScript / ESM
- docs VitePress
- playground
- CLI structurée

Mais la soumission doit idéalement attendre la fermeture de quelques points de présentation et de packaging.

## 3. Audit synthétique

### Conforme / déjà bon

- `defineNuxtModule(...)` déjà présent dans `src/module.ts`
- `meta.name` présent: `nuxt-feathers-zod`
- `meta.configKey` présent: `feathers`
- `meta.compatibility.nuxt` présent: `^4.0.0`
- package ESM (`"type": "module"`)
- TypeScript natif
- docs VitePress présentes (`docs/`)
- playground présent (`playground/`)
- build module via `@nuxt/module-builder`
- plusieurs imports runtime déjà explicites via `#imports` / `#app`

### À corriger avant soumission

1. **Retirer le wording “official Nuxt 4 module”** dans le README.
   - À remplacer par une formulation neutre du type:
     - `FeathersJS + Zod for Nuxt`
     - `CLI-first Feathers integration for Nuxt`

2. **Éviter le branding “Nuxt 4” dans le positionnement principal**.
   - La compatibilité doit vivre dans `meta.compatibility` et la doc, pas dans le slogan principal.

3. **Nettoyer les dépendances `latest`** dans `package.json`.
   - Pour un module listé, il vaut mieux publier avec des plages semver contrôlées.

4. **Passer l’URL du repository en HTTPS public**.
   - Remplacer `git+ssh://git@github.com/...` par une URL HTTPS publique.

5. **Préparer une démo publique simple**.
   - idéalement un starter minimal ou une démo StackBlitz / repo exemple.

6. **Clarifier la proposition de valeur en 3 minutes**.
   - `embedded mode`
   - `remote mode`
   - `CLI-first`
   - `services/schema builder`
   - `diagnostics/tracing`

### Nice-to-have

- ajouter `homepage`
- ajouter `bugs`
- enrichir `keywords`
- ajouter une page “Why NFZ?”
- ajouter une page “NFZ vs direct Feathers / NFZ vs backend maison”

## 4. Plan de correction avant soumission

### Bloc A — packaging

- [ ] remplacer les `latest` critiques par des plages semver stables
- [ ] corriger `repository.url` en HTTPS
- [ ] ajouter `homepage`
- [ ] ajouter `bugs.url`
- [ ] ajouter des `keywords` ciblés:
  - `nuxt-module`
  - `feathersjs`
  - `zod`
  - `nitro`
  - `socket.io`
  - `mongodb`

### Bloc B — README / site

- [ ] retirer le mot “official”
- [ ] retirer la mise en avant “Nuxt 4 only” du titre marketing
- [ ] ajouter une section **Why / What / How**
- [ ] ajouter une section **Who is this for?**
- [ ] ajouter une section **When to use embedded vs remote**
- [ ] ajouter une section **5-minute quickstart** ultra courte

### Bloc C — DX démontrable

- [ ] publier un starter minimal embedded
- [ ] publier un starter minimal remote
- [ ] ajouter une démo auth simple
- [ ] ajouter une page demo/landing qui montre la promesse du module en 3 minutes

### Bloc D — dossier de listing

- [ ] vérifier que le package npm publié correspond bien à la doc
- [ ] vérifier que la doc publique ne contient pas de pages internes/pro non destinées au listing
- [ ] ouvrir une issue dans `nuxt/modules`

## 5. Proposition de wording README / listing

### Titre recommandé

`nuxt-feathers-zod` — FeathersJS + Zod for Nuxt

### Sous-titre recommandé

`CLI-first Feathers integration for Nuxt with embedded and remote modes, typed services and optional auth tooling.`

### Pitch court

`nuxt-feathers-zod` helps you run Feathers inside Nuxt/Nitro or connect a Nuxt app to an external Feathers API, with typed generation, CLI scaffolding and optional auth/runtime helpers.

## 6. Brouillon d’issue pour nuxt/modules

### Title

`Add nuxt-feathers-zod to nuxt.com/modules`

### Body

```md
## Description

`nuxt-feathers-zod` is a community Nuxt module that integrates FeathersJS with Nuxt using two modes:
- embedded mode: Feathers runs inside Nuxt/Nitro
- remote mode: Nuxt connects to an external Feathers API

It also provides a CLI-first workflow for service scaffolding, typed runtime helpers and optional auth tooling.

## Links

- npm: https://www.npmjs.com/package/nuxt-feathers-zod
- repository: https://github.com/vevedh/nuxt-feathers-zod
- documentation: https://vevedh.github.io/nuxt-feathers-zod/

## Why it fits the Nuxt ecosystem

- built with `defineNuxtModule`
- typed module options
- explicit `configKey`
- explicit `compatibility.nuxt`
- Nuxt runtime integration for embedded and remote usage
- documented with VitePress
- comes with a playground / demo app

## Notes

I would like feedback on any remaining best-practice adjustments before listing.
```

## 7. Ordre conseillé d’exécution

1. corriger README + package metadata
2. geler les versions `latest` trop larges
3. publier une release npm propre
4. vérifier docs + playground
5. ouvrir l’issue `nuxt/modules`

## 8. Décision

Tu peux **préparer la soumission maintenant**, mais je recommande **une passe de polish avant dépôt**. Le module est déjà bien avancé techniquement; les principaux écarts restants sont surtout:
- présentation/positionnement
- hygiene package metadata
- démonstration publique
