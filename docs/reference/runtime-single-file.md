---
editLink: false
---
# Runtime NFZ en un fichier

Cette page fournit une vue de comparaison volontairement simplifiée entre le runtime généré par **nuxt-feathers-zod** et un `app.js` produit par la CLI officielle Feathers.

Le fichier complet est disponible dans le dépôt :

```txt
examples/nfz-runtime-single-file.app.ts
```

## Objectif

NFZ ne démarre pas normalement un serveur Node autonome comme un projet Feathers CLI classique. Il compose un serveur Feathers v5 dans le cycle de vie Nuxt/Nitro, puis expose les transports REST et Socket.IO via les templates générés.

Le fichier global sert donc de **modèle mental** :

- visualiser la création de l'application Feathers ;
- visualiser l'ordre des plugins ;
- comparer REST, Socket.IO, auth locale, MongoDB et services ;
- diagnostiquer les écarts entre un runtime NFZ embedded et un `app.js` Feathers natif.

## Correspondance avec un app.js Feathers CLI

| Feathers CLI natif | NFZ embedded |
| --- | --- |
| `src/app.ts` / `app.js` | `.nuxt/feathers/server/app.ts` généré |
| `app.configure(rest())` | template serveur embedded REST |
| `app.configure(socketio())` | template serveur embedded Socket.IO |
| `app.configure(authentication)` | template `authentication.ts` si auth activée |
| `app.configure(services)` | scan `feathers.servicesDirs` + registrations générés |
| serveur Express/Koa autonome | bridge Nitro/H3 + runtime Nuxt |

## Usage recommandé

Ce fichier n'est pas destiné à remplacer les templates NFZ. Il sert à relire le runtime dans un format proche de Feathers CLI, utile pour les audits, les backports et les comparaisons de comportement.
