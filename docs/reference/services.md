# Services

## Services applicatifs

Les services applicatifs vivent dans les dossiers déclarés par `servicesDirs`. La CLI produit la structure attendue par le scanner :

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

Pour une méthode personnalisée :

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod
```

Les méthodes standard Feathers et les méthodes personnalisées sont déclarées séparément.

## Services NFZ de console

Lorsque `console.enabled` est actif, le module enregistre huit services Feathers avant `app.setup()`.

| Service | Méthodes | Rôle |
|---|---|---|
| `nfz/services` | `find` | découverte des services et de leur source |
| `nfz/schemas` | `find`, `get`, `patch` | lecture et synchronisation des schémas |
| `nfz/manifest` | `get`, `patch` | manifeste NFZ courant |
| `nfz/builder` | `create` | preview et apply d’un plan Builder |
| `nfz/status` | `find` | état console, authentification et RBAC |
| `nfz/rbac` | `get`, `patch` | politique RBAC |
| `nfz/presets` | `find`, `create` | liste, preview et application de presets |
| `nfz/init` | `create` | opérations d’initialisation guidée |

## Découverte

```ts
const builder = useBuilderClient()
const discovery = await builder.getServices<{
  projectRoot: string
  servicesDirs: string[]
  services: Array<{
    name: string
    source: 'manifest' | 'scan'
  }>
}>()
```

La Console Builder utilise exactement ce résultat. Elle ne suppose pas que `services` est un tableau de chaînes.

## Schémas

```ts
const schema = await builder.getSchema('users')
```

Le nom du service est validé. Les noms dangereux comme `__proto__`, `prototype` et `constructor` sont rejetés dans les entrées Builder.

## Builder

```ts
const preview = await builder.preview({
  service: 'users',
  fields: schema.fields,
})
```

L’action `apply` est protégée par `console.allowWrite` :

```ts
await builder.apply({
  service: 'users',
  fields: schema.fields,
})
```

Les payloads sont bornés en profondeur, nombre de nœuds et nombre de champs afin de limiter les entrées anormales.

## RBAC

```ts
const current = await builder.getRbac()
await builder.saveRbac(current.file)
```

L’écriture est refusée lorsque `console.allowWrite` vaut `false`.

## Compatibilité 6.x

Les routes `/api/nfz/**` ne sont pas des services métier indépendants. Lorsqu’elles sont activées, elles délèguent aux services ci-dessus et ajoutent des en-têtes de dépréciation.

<!-- release-version: 6.5.47 -->
