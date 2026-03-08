---
title: Service sans adapter + méthode custom
layout: false
---

# Service sans adapter + méthode custom

Cette page documente un **template “copy/paste”** livré dans l’archive du dépôt :

- `templates/custom-service-action/`

Objectif :

- créer un service **sans adapter** (pas de MongoDB/Memory/etc.)
- exposer une méthode custom comme `run`
- garder le style **Zod-first** (validateData/resolveData/resolveResult)
- obtenir un typage client complet (REST + custom method)

## Pourquoi il faut déclarer la méthode custom 2 fois

Pour qu’une méthode custom soit utilisable via REST côté client, elle doit être listée :

- côté serveur : `app.use(path, service, { methods: ['find', 'run'] })`
- côté client : `client.use(path, connection.service(path), { methods: ['find', 'run'] })`

Si tu oublies l’un des deux :
- serveur : la méthode n’est pas exposée
- client : le proxy REST ne la monte pas (et TypeScript ne voit rien)

## Étapes (copier/coller)

1) Copier le template :

```
cp -r templates/custom-service-action services/actions
```

2) Vérifier que les fichiers existent :

- `services/actions/actions.ts`
- `services/actions/actions.shared.ts`
- `services/actions/actions.class.ts`
- `services/actions/actions.schema.ts`

3) Appeler la méthode custom dans Nuxt :

```ts
const api = useNuxtApp().$api
const res = await api.service('actions').run({ action: 'reindex' })
```

## Adapter le template à ton propre service

- Renommer `actionsPath = 'actions'`
- Renommer `actionsMethods = ['find', 'run']`
- Renommer la méthode `run` si besoin, et **la garder dans `methods`**
- Renforcer la validation Zod (payload) selon ton use-case
