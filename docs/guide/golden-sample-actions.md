---
layout: false
---
# Exemple officiel : `actions` (golden sample)

Le service `services/actions` est **l’exemple officiel** (“golden sample”) d’un **service sans adapter avec méthodes custom** généré par la CLI.

Pourquoi le garder dans le repo ?
- fournir une démo immédiate (page playground `/actions`)
- servir de référence de code (auth + Zod + custom method `run`)
- détecter rapidement les régressions (templates/CLI)

> Règle : `actions` ne doit jamais diverger de la sortie générée par `add service actions --custom`.

---

## Régénérer `actions` (recommandé)

À la racine du repo :

```bash
bun install
bun run sync:actions
```

Cela exécute :

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run --auth --docs --force
```

- `--force` écrase les fichiers `services/actions/*` (volontaire).
- Tu peux relancer cette commande à chaque modification des templates.

---

## Vérification rapide

Après régénération :

- `services/actions/actions.ts` doit contenir une validation du résultat de `run` en **around hook**
- la page `/actions` doit permettre d’appeler `run` sans erreur.
