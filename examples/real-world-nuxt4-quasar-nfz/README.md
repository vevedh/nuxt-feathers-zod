# Real-world Nuxt 4 + Quasar + NFZ snippets

Snippets complémentaires pour les guides d’intégration réelle NFZ.

Ces fichiers illustrent l’intégration observée dans le projet Portail COSCA / Portail Comité :

- configuration Nuxt 4 + Quasar + UnoCSS + Pinia + NFZ ;
- service `users --auth` avec `users.schema.ts` ;
- `passwordHash({ strategy: 'local' })` dans le resolver ;
- hooks RBAC ;
- composables `useNfzAuth()` et `useAdminFeathers()` ;
- middleware `admin-auth` ;
- seed users via service Feathers.

Ces snippets sont documentaires : adapte les noms de variables d’environnement, chemins et rôles à ton application.
