---
editLink: false
---
# Custom services & méthodes personnalisées

Un **custom-service** est un service Feathers **sans adapter** (pas Mongo/SQL).
Il expose des méthodes “métier” comme `run`, `execute`, `status`, etc.

Cas d’usage typiques :
- actions métier (reindex, purge, import, export)
- orchestrateurs / automate DevOps
- appels à des APIs externes (Stripe, OVH, etc.)
- batch jobs

---

## Générer via la CLI (recommandé)

```bash
bunx nuxt-feathers-zod add custom-service actions   --methods find   --customMethods run   --auth   --docs
```

✅ Le générateur crée automatiquement :
- `actions.schema.ts` (Zod + types)
- `actions.class.ts` (implémentation, inclut `run()`)
- `actions.ts` (registration serveur, `app.use`)
- `actions.shared.ts` (registration client + typing + SSR-safe)

---

## Utilisation côté client (Nuxt)

```ts
const actions = useService('actions')

await actions.find()
await actions.run({ action: 'reindex', payload: { full: true } })
```

---

## Fonctionnement interne (important)

### 1) SSR-safe

En SSR (server-side rendering), le client ne doit **pas** déclarer `run` dans `methods`
si le transport REST ne fournit pas nativement `remote.run`.

Donc la règle est :
- SSR : `methods: ['find']` (ou uniquement natifs)
- Browser : patch `run()` puis `methods: ['find','run']`

### 2) Transport-agnostic

Dans `*.shared.ts`, la méthode custom est attachée selon la meilleure option disponible :

1. `remote.run` si déjà présent (transport qui expose la méthode)
2. `remote.request` (REST custom method)
3. `remote.send` (socket low-level)
4. fallback HTTP via `$fetch` vers :

```txt
POST {restUrl}{restPrefix}/{servicePath}/{method}
```

Les valeurs `restUrl` et `restPrefix` sont lues depuis :

- `useRuntimeConfig().public.feathers.rest.path`
- `useRuntimeConfig().public.feathers.restUrl`

---

## Erreurs courantes (et comment on les évite)

### ❌ `Can not apply hooks. 'run' is not a function`

Cause :
- tu déclares `run` dans `methods` côté client
- mais `remote.run` n’existe pas (SSR/REST)

Fix :
- ne pas inclure `run` en SSR
- patcher `run` avant `client.use()` en browser

### ❌ `[actionsClient] Custom method "run" is not available on the client service`

Cause :
- `methods` ne contient pas `run`, ou la connection n’est pas REST, ou le patch n’a pas été fait

Fix :
- browser : `client.use(path, remote, { methods: ['find','run'] })` **après patch**
- s’assurer que `runtimeConfig.public.feathers.rest.path` est correct

---

## Bonnes pratiques

- Garder les custom-services **stateless** quand possible
- Valider systématiquement `data` et `result` avec Zod
- Centraliser la logique de transport-agnostic dans `*.shared.ts`
- Ne jamais “hardcoder” `/feathers` : lire le runtime config


## Générer via la CLI (v6.2+)

À partir de **v6.2**, la CLI supporte directement la génération d’un *custom-service* (sans adapter) :

```bash
bunx nuxt-feathers-zod add custom-service jobs --methods find --customMethods run --auth --docs
```

Options utiles :
- `--methods` : méthodes standards Feathers (CSV), ex: `find,get`
- `--customMethods` : méthodes custom (CSV), ex: `run,execute`
- `--path` : chemin exposé (par défaut = nom du service)
- `--auth` : protège le service via JWT
- `--docs` : active l’intégration swagger legacy si disponible

Ensuite, teste dans le playground :
- page UI si tu en as une (`/jobs`)
- ou REST : `POST /feathers/jobs/run` (Bearer token)



## Exemple officiel (golden sample)

Le repo contient un service `actions` conservé volontairement comme **exemple officiel**.
Voir : [`actions` (golden sample)](/guide/golden-sample-actions).
