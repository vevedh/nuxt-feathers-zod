---
editLink: false
---
# Checklist intégration NFZ réelle

## Configuration

- [ ] `nuxt-feathers-zod` installé
- [ ] `@pinia/nuxt` installé
- [ ] `nuxt-quasar-ui` installé si UI Quasar
- [ ] `@unocss/nuxt` installé si UnoCSS
- [ ] `database.mongo.url` configuré, ou `database.connections` avec une connexion par défaut explicite
- [ ] `auth.authStrategies` configuré
- [ ] `entityClass: 'User'` aligné avec `users.schema.ts`
- [ ] `servicesDirs` configuré si nécessaire

## Service users

- [ ] `users.schema.ts` existe
- [ ] `User` est exporté
- [ ] `passwordHash({ strategy: 'local' })` dans resolver
- [ ] `password` masqué dans external resolver
- [ ] `users.create` externe protégé
- [ ] `users.get` limité à self/admin
- [ ] seed via `app.service('users').create()`

## Auth UI

- [ ] `useNfzAuth()` centralise login/logout/reAuthenticate
- [ ] JWT stocké proprement
- [ ] `studioSession` ou store équivalent comme cache UI
- [ ] middleware `auth`
- [ ] middleware `admin-auth`
- [ ] middleware `member-auth`
- [ ] fallback démo désactivé en production

## Quasar

- [ ] `nuxt-quasar-ui` utilisé
- [ ] pas de plugin Quasar manuel sauf besoin très spécifique
- [ ] `AppFullscreen` si nécessaire
- [ ] composants dépendants viewport rendus client-safe
- [ ] QDrawer initialisé de façon SSR-safe

## Pinia / Vue

- [ ] pas de `structuredClone()` direct sur store réactif
- [ ] usage de `toRaw()` + JSON pour les brouillons éditables
- [ ] pas de store Pinia comme source de vérité serveur

## Production

- [ ] `NFZ_ENABLED=true`
- [ ] fallback démo désactivé
- [ ] seed désactivé ou contrôlé
- [ ] MongoDB persistante
- [ ] secrets uniquement via `.env`
- [ ] actions admin protégées côté Feathers
