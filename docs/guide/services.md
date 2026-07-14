# Services Feathers et Zod

Un service est l’unité fonctionnelle principale de `nuxt-feathers-zod`. La CLI génère la structure attendue par le scanner, les imports serveur et, selon le mode choisi, le schéma Zod ou JSON.

## Générer un service standard

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --collection articles \
  --schema zod
```

Adapters pris en charge par la CLI :

- `memory` ;
- `mongodb`.

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
bunx nuxt-feathers-zod auth service articles --enabled true
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

<!-- release-version: 6.5.47 -->
