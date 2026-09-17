---
editLink: false
---
# Matrice de certification des bases de données

NFZ expose une matrice unique pour les moteurs intégrés. Elle est dérivée des descripteurs runtime utilisés par le registre de connexions, puis contrôlée par les gates de release afin d'éviter qu'un statut public diverge du code réellement livré.

## Matrice 6.7.49

| Type | Provider | Famille | Client runtime | Driver | Transactions | Namespaces de schéma | Certification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mongodb` | `mongodb` | document | — | MongoDB natif | non générique | non | **certified** |
| `postgresql` | `knex` | SQL | `pg` | `pg` | oui | oui | **certified** |
| `mysql` | `knex` | SQL | `mysql2` | `mysql2` | oui | non | **certified** |
| `mariadb` | `knex` | SQL | `mysql2` | `mysql2` | oui | non | **certified** |
| `sqlite` | `knex` | SQL | `better-sqlite3` | `better-sqlite3` | oui | non | **certified** |
| `mssql` | `knex` | SQL | `mssql` | `tedious` | oui | oui | **certified** |

Le statut `certified` signifie que le chemin NFZ correspondant possède une preuve de non-régression maintenue. Pour les moteurs SQL, la release est plus stricte : PostgreSQL, MySQL, MariaDB, SQLite et MSSQL doivent tous valider **le même tarball candidat exact** avant promotion.

MongoDB conserve sa couverture certifiée historique via le runtime embedded, les tests MongoDB, le starter et les gates de production. Le train SQL 6.7.45 → 6.7.48 ajoute en plus une certification moteur exacte et candidate-bound pour chaque dialecte relationnel.

## Chaîne SQL immuable

Le manifeste final doit conserver exactement la chaîne de validations suivante sur un SHA candidat unique :

```text
postgresql,mysql,mariadb,sqlite,mssql,database-matrix,starter,consumer
```

L'ordre de release autoritatif est :

```text
release:candidate
  -> PostgreSQL
  -> MySQL + MariaDB
  -> SQLite
  -> MSSQL
  -> database-matrix
  -> starter exact
  -> consumer npm propre
  -> release:finalize
```

`release:finalize` et `publish:npm` refusent un artefact si une validation manque ou référence un autre SHA.

La gate `database-matrix` pré-vérifie ses images Docker avant de démarrer les conteneurs : `mongo:7.0` et `postgres:18-alpine` par défaut. Si une image n'est pas locale, elle est téléchargée explicitement avec un timeout borné avant `docker run`; les mainteneurs peuvent surcharger ces pins avec `NFZ_MATRIX_MONGODB_DOCKER_IMAGE` et `NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE`.

## Capabilities publiques

Les capabilities décrivent ce que NFZ abstrait de manière portable, pas tout ce que chaque SGBD sait faire nativement. La certification crée donc de vrais index et utilise de vraies transactions pour prouver les chemins moteur, sans annoncer une API générique que NFZ n'expose pas.

Les limites restent explicitement :

- `indexManagement: false`
- `migrations: false`
- aucune transaction distribuée entre connexions nommées ;
- aucune promesse de portabilité des opérateurs propriétaires d'un moteur.

`schemaNamespaces` vaut `true` uniquement pour PostgreSQL et MSSQL. SQLite utilise un pool NFZ borné à une connexion pour préserver les sémantiques de fichier.

## Inspection CLI

La matrice runtime peut être inspectée sans ouvrir de connexion :

```bash
bunx nuxt-feathers-zod capabilities --section databases --json
```

Le doctor affiche également le nombre de moteurs intégrés et certifiés :

```text
database.supportedEngines: mongodb, postgresql, mysql, mariadb, sqlite, mssql
database.certifiedEngines: 6/6
```

Pour l'état d'une connexion configurée, utilisez `nuxt-feathers-zod doctor` ou le service Feathers `nfz/database-connections`. Les diagnostics restent expurgés des secrets.

<!-- release-version: 6.7.51 -->
