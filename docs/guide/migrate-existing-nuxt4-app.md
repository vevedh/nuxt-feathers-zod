---
editLink: false
---
# Migrer une application Nuxt 4 existante vers NFZ

Ce guide explique comment migrer progressivement une application Nuxt 4 existante vers `nuxt-feathers-zod`, sans casser l'UI ni l'expérience utilisateur.

## 1. Identifier les stores locaux

Avant NFZ, beaucoup d'applications métier démarrent avec :

```txt
Pinia + localStorage + seeds locaux
```

Après NFZ, la cible devient :

```txt
Feathers service + MongoDB + Pinia cache UI
```

Le store Pinia ne doit plus être la vérité métier. Il devient un cache, une façade UX ou un adapter vers les services NFZ.

## 2. Activer NFZ progressivement

Commence avec :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
NFZ_ENABLED=false
```

Puis active NFZ lorsque le service `users` et MongoDB sont prêts :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
NFZ_ENABLED=true
```

## 3. Garder un fallback démo temporaire

Pendant la migration :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
AUTH_DEMO_FALLBACK=true
```

En production :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
AUTH_DEMO_FALLBACK=false
```

## 4. Migrer l'auth d'abord

Toujours commencer par :

```bash
bunx nuxt-feathers-zod add service users --auth
```

Puis vérifier que la structure contient :

```txt
services/users/users.schema.ts
services/users/users.class.ts
services/users/users.ts
services/users/users.shared.ts
services/users/users.hooks.ts
```

Le service `users` est la base de toute la suite : RBAC, admin, espace membre, gestion médias et services protégés.

## 5. Migrer les médias

Créer un service :

```bash
bunx nuxt-feathers-zod add service media-assets
```

Puis brancher MinIO/S3 ou un stockage stable.

Objectif : éviter les Data URL persistées dans les contenus Markdown en production.

## 6. Migrer les contenus éditables

Exemples de services :

```txt
site-sections
theme-settings
news
documents
faq-items
pages
media-assets
```

Chaque service doit avoir :

- schéma Zod ;
- hooks RBAC ;
- resolver externe ;
- store Pinia ou composable client ;
- écran admin.

## 7. Migrer les modules admin

Chaque page admin doit passer par :

```txt
store Pinia métier
  -> useAdminFeathers()
    -> service NFZ
```

Éviter :

```txt
page Vue -> $fetch('/api/...') pour le métier
```

Préférer :

```txt
page Vue -> store/composable -> app.service('service-name')
```

## 8. Supprimer le fallback local

Quand les services sont stables :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
AUTH_DEMO_FALLBACK=false
```

Puis vérifier :

- login réel ;
- refresh page ;
- accès admin ;
- accès membre ;
- logout ;
- JWT expiré ;
- seed désactivé en production.

## 9. Ordre de migration conseillé

```txt
1. users --auth
2. studioSession / useNfzAuth
3. middlewares auth/admin/member
4. media-assets
5. site-sections / home hero
6. theme-settings
7. news
8. activities
9. partners
10. forms
```

## 10. Règle importante

Ne migre pas toute l'application d'un seul coup.

Procède service par service, en gardant les stores existants comme façade temporaire.
