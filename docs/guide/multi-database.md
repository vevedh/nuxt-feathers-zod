# Registre multi-base de données

Depuis la version 6.7.0, NFZ peut initialiser plusieurs connexions nommées et laisser chaque service Feathers choisir sa connexion. Le registre couvre MongoDB et les bases SQL prises en charge par Knex : PostgreSQL, MySQL, MariaDB et SQLite.

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

Les propriétés privées `url` et `connection` restent dans `runtimeConfig._feathers`. La configuration publique expose uniquement le nom, le type, l’état par défaut et les options de diagnostic non sensibles.

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

## Générer un service sur une connexion nommée

MongoDB :

```bash
bunx nuxt-feathers-zod@6.7.37 add service messages \
  --adapter mongodb \
  --connection primary \
  --collection messages \
  --schema zod
```

PostgreSQL avec une table et un schéma SQL explicites :

```bash
bunx nuxt-feathers-zod@6.7.37 add service audit-events \
  --adapter knex \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod \
  --auth
```

Le service MongoDB généré utilise `getNfzMongoDatabase(app, 'primary')`. Le service Knex utilise `getNfzKnexClient(app, 'reporting')`. Aucun service ne crée sa propre connexion.

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
} from 'nuxt-feathers-zod/server-database'
```

Utilisez ces helpers dans les services ou modules Feathers. Ne lisez pas directement les structures internes du registre.

## Limites de 6.7.0

- NFZ initialise les connexions et fournit les adapters, mais ne crée pas les tables SQL ni les migrations Knex.
- Une transaction couvrant plusieurs connexions n’est pas atomique.
- MikroORM et les entités relationnelles sont réservés à une version ultérieure.
- Les pilotes SQL restent des dépendances optionnelles de l’application consommatrice.

<!-- release-version: 6.7.37 -->
