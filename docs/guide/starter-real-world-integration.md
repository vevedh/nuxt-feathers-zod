---
editLink: false
---
# Starter Nuxt 4 + Quasar + UnoCSS + Pinia

Le starter `nfz-quasar-unocss-pinia-starter` est le point de départ recommandé pour créer une application métier avec :

- Nuxt 4 ;
- Quasar 2 ;
- UnoCSS ;
- Pinia ;
- nuxt-feathers-zod ;
- auth locale ;
- services Feathers ;
- MongoDB ;
- RBAC.

## Pourquoi ce starter est important ?

Il ne s'agit pas seulement d'un exemple. Pour une application métier avec dashboard et administration, il sert de référence d'intégration complète.

Il montre les conventions recommandées pour :

- `nuxt.config.ts` ;
- `nuxt-quasar-ui` ;
- auth locale/JWT ;
- service `users --auth` ;
- stores Pinia ;
- middlewares ;
- layouts ;
- dashboard admin ;
- accès services NFZ ;
- RBAC.

## Quand partir du starter ?

Utilise le starter si tu construis :

- un portail adhérent ;
- une console admin ;
- une application métier ;
- un dashboard ;
- une application avec RBAC ;
- une app avec MongoDB et services métier ;
- une app Nuxt 4 qui doit intégrer Feathers embedded.

## Quand ne pas partir du starter ?

Tu peux installer seulement `nuxt-feathers-zod` si tu fais :

- un module très minimal ;
- un simple client remote ;
- une API Feathers externe ;
- une preuve de concept sans UI admin.

## Structure cible inspirée du starter

```txt
app/
├─ assets/
├─ components/
├─ composables/
├─ layouts/
├─ middleware/
├─ pages/
├─ stores/
└─ types/

services/
├─ users/
└─ <business-services>/

server/
└─ feathers/
```

## Configuration recommandée

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@unocss/nuxt',
    'nuxt-feathers-zod'
  ]
})
```

## Règle auth

Le starter doit être suivi pour :

- `passwordHash({ strategy: 'local' })` dans le resolver ;
- `userExternalResolver` pour masquer `password` ;
- classe runtime `User` dans `users.schema.ts` ;
- hooks dédiés au RBAC ;
- seed via service Feathers, pas insertion Mongo brute.
