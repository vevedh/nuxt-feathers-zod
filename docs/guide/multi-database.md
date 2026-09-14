# Registre multi-base de données

Depuis la version 6.7.0, NFZ peut initialiser plusieurs connexions nommées et laisser chaque service Feathers choisir sa connexion. À partir de 6.7.41, chaque moteur est aussi décrit par un **provider**, une **famille de base** exposée par `databaseFamily`, un niveau de **certification** et un jeu de **capabilities** non sensibles. MongoDB et PostgreSQL sont certifiés par des gates réelles ; MySQL, MariaDB et SQLite disposent d'un chemin implémenté via Knex mais restent non certifiés jusqu'à leurs patches dédiés.

## Configuration recommandée

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    database: {
      default: 'primary',
      connections: {
        primary: {
          type: 'mongodb',
          url: process.env.MONGODB_URL!,
          database: 'application',
          management: {
            enabled: false,
          },
        },
        reporting: {
          type: 'postgresql',
          connection: process.env.REPORTING_DATABASE_URL!,
          pool: {
            min: 1,
            max: 10,
          },
        },
        localCache: {
          type: 'sqlite',
          connection: {
            filename: './data/cache.sqlite',
          },
          useNullAsDefault: true,
          required: false,
        },
      },
    },
  },
})
```

Les propriétés privées `url` et `connection` restent dans `runtimeConfig._feathers`. La configuration publique expose uniquement le nom, le type, le provider, `databaseFamily`, le niveau de certification, les capabilities et les options de diagnostic non sensibles.


## Provider et capabilities

NFZ sépare désormais le **moteur** (`type`) du **provider runtime**. Cette distinction évite de disséminer des tests `if (type === ...)` dans le runtime et prépare l'ajout de nouveaux moteurs sans fallback implicite.

| Type | Provider | Famille (`databaseFamily`) | Client Knex | Package driver | Pool NFZ par défaut | Certification NFZ |
| --- | --- | --- | --- | --- | --- | --- |
| `mongodb` | `mongodb` | document | — | driver MongoDB natif | — | certifié |
| `postgresql` | `knex` | SQL | `pg` | `pg` | `min: 0, max: 10` | certifié |
| `mysql` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | chemin implémenté |
| `mariadb` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | chemin implémenté |
| `sqlite` | `knex` | SQL | `better-sqlite3` | `better-sqlite3` | `min: 0, max: 1` | chemin implémenté |

Les diagnostics `nfz/database-connections` exposent uniquement ces métadonnées et les capabilities sans secret. Le nom `databaseFamily` est volontaire : MongoDB possède déjà une option native `family` pour la sélection IPv4/IPv6 ; NFZ la conserve sans la détourner. À partir de 6.7.42, les connexions SQL annoncent `transactions: true` parce que NFZ expose désormais un helper transactionnel borné à **une seule connexion nommée**. `indexManagement` et `migrations` restent à `false` jusqu'aux patches dédiés.

Le mapping du client et du package driver est **exhaustif et fail-closed** : un nouveau `type` doit obtenir un descripteur explicite avant de pouvoir être résolu. Au démarrage réel d'une connexion SQL, NFZ vérifie que le package driver attendu est installé avant de créer le client Knex. Un `client` Knex avancé reste possible, mais il doit alors déclarer explicitement `driverPackage`; NFZ n'essaie pas de deviner le pilote correspondant. Les diagnostics publics exposent `defaultClient`, `driverPackage` et le booléen `customClient`, jamais une chaîne de connexion.

## Dépendances SQL

Le support SQL est optionnel. Installez Knex, l’adapter Feathers et le pilote correspondant :

```bash
bun add @feathersjs/knex knex
bun add pg
```

Pour MySQL ou MariaDB :

```bash
bun add @feathersjs/knex knex mysql2
```

Pour SQLite :

```bash
bun add @feathersjs/knex knex better-sqlite3
```

Le provider SQL charge Knex et le driver à la demande. L'absence du package attendu produit une erreur explicite avant l'ouverture de la connexion, au lieu de laisser Knex échouer plus loin avec un message dépendant du dialecte.


## Certification PostgreSQL

À partir de 6.7.45, PostgreSQL est un moteur **certifié NFZ**. La gate de release exécute le tarball npm candidat exact contre une instance PostgreSQL réelle et isolée. Elle couvre :

- connexion et health check via `pg`/Knex ;
- création et suppression d'un schéma isolé ;
- création de tables et d'un index PostgreSQL réel ;
- CRUD Feathers avec identifiant entier ;
- filtres numériques, `$in`, pagination et `$sort` issus d'une query HTTP ;
- transaction avec rollback vérifié ;
- authentification locale puis JWT sur une entité utilisateur à identifiant UUID ;
- fermeture du registre et teardown du schéma.

La gate utilise Docker par défaut (`postgres:18-alpine`) et peut utiliser une base externe explicitement dédiée :

```powershell
$env:NFZ_POSTGRESQL_CERTIFICATION_URL = 'postgresql://nfz:secret@127.0.0.1:5432/nfz_cert'
bun run release:candidate
bun run test:postgresql:release
```

Sans `NFZ_POSTGRESQL_CERTIFICATION_URL`, Docker doit être disponible. La validation crée toujours un schéma `nfz_cert_*` dédié puis le supprime ; n'utilisez néanmoins qu'une base prévue pour la certification. Cette preuve ne transforme pas `indexManagement` ou `migrations` en capabilities génériques NFZ : ces APIs restent à `false` tant qu'un contrat provider-neutral n'existe pas.

### Migration depuis 6.7.44 et versions antérieures

La certification 6.7.45 ne change pas la forme de `feathers.database.connections` ni les services Knex générés. Pour migrer un projet PostgreSQL existant :

1. mettez NFZ à niveau vers 6.7.45 ;
2. gardez `type: 'postgresql'` et votre connexion nommée ;
3. vérifiez que `@feathersjs/knex`, `knex` et `pg` sont installés dans l'application ;
4. exécutez vos migrations applicatives habituelles avant le démarrage NFZ ;
5. utilisez `nuxt-feathers-zod doctor` et `nfz/database-connections` pour vérifier que la connexion remonte `certification: 'certified'` et un health check vert.

NFZ ne lance pas automatiquement vos migrations SQL et ne modifie pas vos schémas applicatifs lors de la mise à niveau.

## Pool SQL sûr

NFZ normalise le pool Knex avant de créer le client :

- PostgreSQL, MySQL et MariaDB : `min: 0`, `max: 10` par défaut ;
- SQLite : `min: 0`, `max: 1` et `pool.max=1` est imposé pour préserver la sémantique d'une base fichier/in-memory unique ;
- `acquireConnectionTimeout` vaut `60000` ms par défaut et doit rester un entier positif ;
- `pool.min`, `pool.max` et les timeouts de pool sont validés avant le démarrage ;
- `pool.min > pool.max` est rejeté au lieu d'être corrigé silencieusement.

Vous pouvez réduire ces limites selon la capacité réelle du serveur :

```ts
reporting: {
  type: 'postgresql',
  connection: process.env.REPORTING_DATABASE_URL!,
  pool: {
    min: 0,
    max: 7,
    idleTimeoutMillis: 30_000,
  },
  acquireConnectionTimeout: 10_000,
}
```

## Générer un service sur une connexion nommée

MongoDB :

```bash
bunx nuxt-feathers-zod@6.7.45 add service messages \
  --database mongodb \
  --connection primary \
  --collection messages \
  --schema zod
```

PostgreSQL avec une table et un schéma SQL explicites :

```bash
bunx nuxt-feathers-zod@6.7.45 add service audit-events \
  --database postgresql \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod \
  --auth
```

Le service MongoDB généré utilise `getNfzMongoDatabase(app, 'primary')`. Le service Knex utilise `getNfzKnexClient(app, 'reporting')`. Aucun service ne crée sa propre connexion.

Depuis 6.7.43, ces manifests enregistrent aussi l'identité portable du binding (`databaseType`, `databaseProvider`, `databaseFamily`). L'ancienne syntaxe `--adapter mongodb|knex` reste acceptée, mais `--database` évite d'exposer le choix d'adapter comme décision métier. `doctor` signale une incohérence lorsque, par exemple, un service généré pour `postgresql` référence une connexion nommée configurée en `mysql`.

### Identifiants portables

À partir de 6.7.44, le binding de service peut aussi enregistrer `idStrategy`. Cette propriété décrit le contrat d'identifiant du service, indépendamment de `databaseType` : MongoDB conserve `objectid` par défaut, les adapters Knex et Memory utilisent `integer` par défaut, et les variantes compatibles sont validées de façon fail-closed.

`uuid` et `string` sont des identifiants fournis à la création dans les templates générés. `bigint` est disponible uniquement sur le chemin Knex et reste une chaîne décimale au niveau API/Zod afin de rester sérialisable en JSON. PostgreSQL dispose maintenant de sa preuve réelle CRUD/auth/query/lifecycle avec UUID et ID entier. Les garanties natives bigint restent volontairement hors de cette certification ; MySQL/MariaDB et SQLite recevront leurs preuves réelles dans leurs patches dédiés.

`doctor` expose `idStrategy` depuis le manifeste et rejette une stratégie incompatible avec l'adapter généré lorsqu'il peut la prouver statiquement.

## Connexion par défaut

Lorsque `--connection` est omis, le service utilise `database.default`. Si aucune connexion par défaut n’est définie, NFZ sélectionne la première connexion activée. En production, définissez toujours `database.default` explicitement pour éviter qu’un changement d’ordre ne modifie le routage des données.

## Compatibilité `database.mongo`

La configuration historique reste valide :

```ts
feathers: {
  database: {
    mongo: {
      url: process.env.MONGODB_URL!,
    },
  },
}
```

NFZ la convertit en connexion nommée `default` et conserve les alias `mongodbClient`, `mongodbDb`, `mongodbConnection`, `currentDatabase` et `mongodb_ok`. Il est interdit de déclarer simultanément `database.mongo` et `database.connections.default`, car cette combinaison serait ambiguë.

## Cycle de vie et tolérance aux pannes

Chaque connexion possède les options suivantes :

| Option | Défaut | Effet |
|---|---:|---|
| `enabled` | `true` | inclut la connexion dans le registre |
| `required` | `true` | bloque le démarrage si la connexion échoue |
| `healthCheck` | `true` | exécute un ping ou `select 1` après connexion |
| `label` | — | ajoute un libellé non sensible aux diagnostics |

Les connexions sont fermées en ordre inverse lors de l’arrêt Nitro. Une connexion facultative en échec reste visible dans les diagnostics mais ne bloque pas l’application.


### Montage des services persistants

Le montage des services est **fail-closed par défaut**. Si un service MongoDB ou Knex requis référence une infrastructure absente, le runtime n’atteint pas l’état `ready` et ferme les ressources déjà ouvertes.

Un projet qui possède volontairement des services facultatifs peut activer temporairement le mode de compatibilité suivant :

```ts
feathers: {
  server: {
    allowMissingDatabaseServices: true,
  },
}
```

Cette option ne doit pas masquer une base requise en production. Les services ignorés sont enregistrés dans `app.get('nfzSkippedRegistrars')` et exposés, sans secret, par `nfz/status`. Un registrar marqué explicitement `required: true` reste bloquant même lorsque le mode de compatibilité est actif.

## Diagnostics Feathers

Lorsque la console NFZ est activée :

```ts
const service = useService('nfz/database-connections')
const status = await service.find()
const reporting = await service.get('reporting')
```

`find()` retourne le dernier état connu. `get(name)` exécute un contrôle de santé frais. Les URL, mots de passe et objets de connexion ne sont jamais retournés.

## Helpers serveur

```ts
import {
  checkNfzDatabaseConnection,
  getNfzDatabaseConnection,
  getNfzDatabaseDiagnostics,
  getNfzDatabaseRegistry,
  getNfzKnexClient,
  getNfzMongoDatabase,
  withNfzSqlTransaction,
} from 'nuxt-feathers-zod/server-database'
```

Utilisez ces helpers dans les services ou modules Feathers. Ne lisez pas directement les structures internes du registre.

### Transaction sur une connexion SQL

`withNfzSqlTransaction()` ouvre une transaction via le client Knex déjà géré par le registre. Le helper refuse une connexion MongoDB et ne tente jamais de coordonner plusieurs bases :

```ts
import type { Knex } from 'knex'
import { withNfzSqlTransaction } from 'nuxt-feathers-zod/server-database'

await withNfzSqlTransaction<void, Knex.Transaction>(app, async (trx) => {
  await trx('audit_events').insert({ action: 'login' })
}, { connection: 'reporting' })
```

Une exception dans le callback est propagée à Knex, qui effectue le rollback de la transaction de cette connexion. Une transaction multi-connexion ou MongoDB + SQL n'est pas simulée par NFZ.

## Limites du train 6.7.x

- NFZ initialise les connexions et fournit les adapters, mais ne crée pas les tables SQL ni les migrations Knex.
- Une transaction couvrant plusieurs connexions n’est pas atomique.
- MikroORM et les entités relationnelles sont réservés à une version ultérieure.
- Les pilotes SQL restent des dépendances optionnelles de l’application consommatrice.

<!-- release-version: 6.7.45 -->
