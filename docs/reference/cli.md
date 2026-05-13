# Référence CLI

La CLI `nuxt-feathers-zod` initialise les projets, génère les services et vérifie la cohérence de la configuration.

```bash
bunx nuxt-feathers-zod --help
```

## Commandes principales

| Commande | Usage |
|---|---|
| `doctor` | Vérifie la configuration Nuxt, les services, le manifeste et les options courantes. |
| `init embedded` | Configure une application avec backend Feathers embarqué. |
| `init remote` | Configure une application cliente connectée à une API Feathers externe. |
| `init starter` | Prépare une base d'application selon un preset. |
| `init templates` | Installe les templates de services. |
| `add service` | Génère un service Feathers standard. |
| `add file-service` | Génère un service d'upload/download. |
| `add remote-service` | Déclare un service consommé depuis une API distante. |
| `add custom-service` | Génère un service sans adapter standard avec méthodes personnalisées. |
| `add middleware` | Génère un middleware applicatif. |
| `add server-module` | Génère un module serveur embedded. |
| `mongo management` | Ajoute la surface d'administration MongoDB. |
| `schema` | Inspecte ou modifie le schéma d'un service. |
| `auth service` | Ajoute un service lié à l'authentification. |
| `templates`, `plugins`, `modules`, `middlewares` | Liste ou ajoute des éléments fournis par les registries du module. |

## Diagnostic

```bash
bunx nuxt-feathers-zod doctor
```

À utiliser après une installation, après une génération de service ou avant une livraison.

## Initialiser un backend embedded

```bash
bunx nuxt-feathers-zod init embedded \
  --auth \
  --database mongodb \
  --framework express \
  --servicesDir services \
  --restPath /feathers \
  --websocketPath /socket.io
```

Options utiles :

- `--auth` active le socle d'authentification ;
- `--database mongodb` prépare l'intégration MongoDB ;
- `--framework express|koa` choisit le framework serveur embedded ;
- `--swagger` active la documentation Swagger lorsque disponible ;
- `--secureDefaults` applique les options serveur conservatrices.

## Initialiser un client remote

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth \
  --payloadMode jwt
```

Options utiles :

- `--url` est obligatoire ;
- `--transport socketio|rest` définit le transport client ;
- `--payloadMode jwt|keycloak` adapte la charge d'authentification ;
- `--tokenField accessToken|access_token` définit le champ de token attendu.

## Générer un service

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

Options utiles :

- `--adapter memory|mongodb|custom` ;
- `--schema none|zod|json` ;
- `--auth` pour un service utilisateur compatible auth ;
- `--collection <name>` pour MongoDB ;
- `--idField <field>` pour définir le champ identifiant.

## Service avec méthodes personnalisées

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find,run --customMethods run
```

Les méthodes personnalisées doivent être déclarées explicitement pour éviter les incohérences entre le client, le serveur et les types.

## Service remote

```bash
bunx nuxt-feathers-zod add remote-service api/ldap-search --methods find
```

Ce mode est adapté aux services exposés par un backend externe et consommés depuis l'application Nuxt.

## Schémas

```bash
bunx nuxt-feathers-zod schema articles --show
bunx nuxt-feathers-zod schema articles --add-field title:string:required
bunx nuxt-feathers-zod schema articles --validate
```

La commande `schema` aide à inspecter et maintenir les schémas sans perdre le contrat attendu par le runtime.

## Règle importante

Pour un service métier, privilégier toujours :

```bash
bunx nuxt-feathers-zod add service <name>
```

La création manuelle de dossiers peut empêcher le scanner de retrouver les exports attendus.


<!-- release-version: 6.5.31 -->
