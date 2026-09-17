# Services Feathers et Zod

Un service est l’unité fonctionnelle principale de `nuxt-feathers-zod`. La CLI génère la structure attendue par le scanner, les imports serveur et, selon le mode choisi, le schéma Zod ou JSON.

## Générer un service standard

```bash
bunx nuxt-feathers-zod add service articles \
  --database mongodb \
  --connection primary \
  --collection articles \
  --schema zod
```

Depuis 6.7.43, la forme recommandée est **moteur + connexion nommée** : `--database` sélectionne le moteur (`mongodb`, `postgresql`, `mysql`, `mariadb`, `sqlite`) et la CLI choisit l'adapter compatible (`mongodb` ou `knex`). `--connection` lie ensuite le service au registre NFZ.

Les anciens sélecteurs `--adapter mongodb|knex` restent compatibles. `--adapter memory` reste la forme adaptée aux services en mémoire. Si `--database` et `--adapter` sont fournis ensemble, NFZ refuse les combinaisons incohérentes.

Pour SQL, utilisez `--table` et, si nécessaire, `--schemaName` :

```bash
bunx nuxt-feathers-zod@6.7.51 add service audit-events \
  --database postgresql \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod
```

Le manifeste `.nfz/services/<service>.json` conserve `connectionName`, `databaseType`, `databaseProvider` et `databaseFamily`. `schema <service> --show` expose ces métadonnées, et `doctor` compare le binding généré à la connexion nommée trouvée dans `nuxt.config.ts` lorsqu'elle peut être résolue statiquement.

### Choisir une stratégie d'identifiant

Depuis 6.7.44, `--idStrategy` rend le contrat d'identifiant explicite sans déduire silencieusement la sémantique depuis le moteur :

| Adapter | Défaut | Stratégies disponibles |
| --- | --- | --- |
| MongoDB | `objectid` | `objectid`, `uuid`, `string` |
| Knex / SQL | `integer` | `integer`, `bigint`, `uuid`, `string` |
| Memory | `integer` | `integer`, `uuid`, `string` |

Exemple PostgreSQL avec UUID :

```bash
bunx nuxt-feathers-zod@6.7.51 add service api-keys \
  --database postgresql \
  --connection reporting \
  --table api_keys \
  --schema zod \
  --idStrategy uuid
```

Le manifeste enregistre alors `idStrategy: "uuid"`, et la classe générée passe explicitement `id: "id"` à l'adapter Feathers. Les stratégies `uuid` et `string` sont considérées comme des identifiants fournis à la création ; `objectid`, `integer` et `bigint` sont omis du schéma de création par défaut afin de laisser l'adapter ou la base les produire.

`bigint` est représenté dans le contrat API par une **chaîne décimale** (`"9223372036854775807"`), et non par un `bigint` JavaScript. Cette convention évite les pertes ou échecs de sérialisation JSON ; le comportement réel des drivers SQL sera certifié moteur par moteur dans les patchs suivants.

Les requêtes Zod préservent cette distinction : les valeurs de query string sont converties en nombres uniquement pour les champs numériques, tandis que UUID, chaînes et bigint décimal restent des chaînes. Les valeurs `$sort` textuelles `"1"` et `"-1"` sont normalisées vers les ordres Feathers `1` et `-1`.

Modes de schéma :

- `none` ;
- `zod` ;
- `json`.

## Générer un service personnalisé

```bash
bunx nuxt-feathers-zod add custom-service reports \
  --methods find \
  --customMethods run \
  --schema zod
```

`find` est une méthode standard Feathers. `run` est une méthode personnalisée déclarée explicitement.

## Gérer les champs

```bash
bunx nuxt-feathers-zod schema articles --show
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod schema articles --set-field published:boolean=false
bunx nuxt-feathers-zod schema articles --rename-field title:headline
bunx nuxt-feathers-zod schema articles --validate
```

Le manifeste et le schéma doivent rester cohérents. La Console Builder du playground utilise les services Feathers `nfz/schemas` et `nfz/builder` pour tester ces mêmes opérations.

## Services protégés

```bash
bunx nuxt-feathers-zod auth service articles --enabled
```

Le contrôle d’accès doit rester dans les hooks Feathers. Évitez de dupliquer la logique d’authentification dans des routes Nitro métier.

## Appel côté client

```ts
const articles = useService('articles')

const page = await articles.find({
  query: {
    published: true,
    $limit: 25,
    $sort: { createdAt: -1 },
  },
})
```

## Appel côté serveur

Un composant serveur qui dispose de l’application Feathers peut appeler le service directement :

```ts
const rows = await app.service('articles').find({
  query: { $limit: 25 },
  provider: undefined,
})
```

Aucune boucle HTTP vers la même application n’est nécessaire.

## Bonnes pratiques

- Validez `data`, `query` et résultats selon la sensibilité du service.
- Déclarez les méthodes personnalisées explicitement.
- Utilisez les hooks Feathers pour l’authentification et l’autorisation.
- N’acceptez jamais un nom de service ou de champ non validé depuis une entrée utilisateur.
- Exécutez `doctor` et `schema <service> --validate` avant une release.

<!-- release-version: 6.7.51 -->
