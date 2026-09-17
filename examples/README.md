# nuxt-feathers-zod examples

Ce dossier regroupe les exemples maintenus du module. Commence par le plus petit exemple correspondant à ton besoin, puis passe au starter complet seulement lorsque tu as besoin de Quasar, Pinia, auth et MongoDB ensemble.

## Parcours recommandé

| Exemple | Type | À utiliser pour |
| --- | --- | --- |
| [`minimal-embedded-memory`](./minimal-embedded-memory/) | runnable | comprendre NFZ embedded, un service Feathers et Zod sans base de données |
| [`nfz-quasar-unocss-pinia-starter`](./nfz-quasar-unocss-pinia-starter/) | runnable / publié avec le package | démarrer une application Nuxt 4 + Quasar 2 + Pinia + MongoDB + auth locale |
| [`remote-rest-minimal`](./remote-rest-minimal/) | runnable avec backend distant | comprendre le mode remote REST sans serveur Feathers local |
| [`sql-knex-named-connections`](./sql-knex-named-connections/) | recette exécutable par étapes | configurer PostgreSQL, MySQL/MariaDB et générer des services Knex sur des connexions nommées |
| [`real-world-nuxt4-quasar-nfz`](./real-world-nuxt4-quasar-nfz/) | snippets | retrouver des patterns d'intégration métier plus complets |
| [`real-world-nuxt4-daisyui-pinia-redis`](./real-world-nuxt4-daisyui-pinia-redis/) | application complète | Nuxt 4 + DaisyUiKit + Pinia + MongoDB + auth/RBAC + Redis cache |
| [`nuxt4-keycloak-ldap-spa-ref`](./nuxt4-keycloak-ldap-spa-ref/) | référence SPA | Keycloak navigateur + backend Feathers/LDAP distant |
| [`nuxt4-keycloak-ldap-ssr-ref`](./nuxt4-keycloak-ldap-ssr-ref/) | référence SSR | même architecture avec shell SSR Nuxt |
| [`remote-keycloak-ldap`](./remote-keycloak-ldap/) | recette | contrat minimal du bridge Keycloak/LDAP remote |

## Choisir rapidement

- **Je découvre NFZ** → `minimal-embedded-memory`.
- **Je veux une application prête à adapter** → `nfz-quasar-unocss-pinia-starter`.
- **Je veux DaisyUiKit + Redis** → `real-world-nuxt4-daisyui-pinia-redis`.
- **Mon backend Feathers existe déjà** → `remote-rest-minimal`.
- **Je veux PostgreSQL/MySQL/MariaDB** → `sql-knex-named-connections`.
- **Je dois intégrer Keycloak/LDAP** → les références `nuxt4-keycloak-ldap-*`.

## Règle de maintenance

Les exemples maintenus utilisent la version courante **nuxt-feathers-zod 6.7.51**. Les exemples lourds ne sont pas tous publiés dans le tarball npm : le starter `nfz-quasar-unocss-pinia-starter` reste l'asset de starter distribué, tandis que les autres exemples sont principalement des références du dépôt source.
