# SQL / Knex named connections

Recette ciblée pour les moteurs SQL certifiés de **nuxt-feathers-zod 6.8.0** : PostgreSQL, MySQL et MariaDB.

## 1. Installer les drivers

```bash
bun add @feathersjs/knex knex pg mysql2
```

## 2. Démarrer les bases de démonstration

```bash
docker compose up -d
cp .env.example .env
```

Le compose utilise les mêmes familles d'images que les gates de certification : PostgreSQL 18 Alpine, MySQL 8.4 et MariaDB 11.8.

## 3. Déclarer des connexions nommées

Voir `nuxt.config.ts`. En production, garde toujours `database.default` explicite.

## 4. Générer un service par moteur

```bash
bunx nuxt-feathers-zod@6.8.0 add service pg-events --database postgresql --connection postgresql --table pg_events --schema zod
bunx nuxt-feathers-zod@6.8.0 add service mysql-events --database mysql --connection mysql --table mysql_events --schema zod
bunx nuxt-feathers-zod@6.8.0 add service mariadb-events --database mariadb --connection mariadb --table mariadb_events --schema zod
```

NFZ partage les connexions du registre : les services générés ne créent pas leur propre pool.

## Limites de dialecte à retenir

- PostgreSQL expose de vrais namespaces de schéma ; MySQL et MariaDB non (`schemaNamespaces: false`).
- MySQL/MariaDB utilisent `mysql2` avec Knex.
- Les IDs UUID de l'exemple de certification MySQL/MariaDB sont stockés en chaîne de 36 caractères ; NFZ ne prétend pas imposer un type UUID natif commun.
- Les transactions certifiées couvrent le **DML**. Les DDL MySQL/MariaDB peuvent provoquer des commits implicites : ne mets pas tes migrations DDL dans une transaction en supposant un rollback portable.
- `indexManagement` et `migrations` restent des capabilities `false` : les gates prouvent le comportement du moteur, pas une API NFZ provider-neutral de migration.
