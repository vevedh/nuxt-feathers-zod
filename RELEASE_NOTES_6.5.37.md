# nuxt-feathers-zod 6.5.37

Cette version corrige la surface Builder du playground et du module. Les endpoints `/api/nfz/**` sont maintenant enregistrés directement par `nuxt-feathers-zod` lorsque `feathers.console.enabled` vaut `true`.

## Routes Builder réellement disponibles

Le module enregistre les routes canoniques suivantes :

- `GET /api/nfz/services` ;
- `GET|POST /api/nfz/manifest` ;
- `GET|POST /api/nfz/schema` ;
- `GET|POST /api/nfz/schema/:service` ;
- `POST /api/nfz/preview` ;
- `POST /api/nfz/apply` ;
- les endpoints de statut, RBAC, presets et initialisation de la console.

La route `GET /api/nfz/schema?service=users` ne retourne donc plus `Page not found`.

## Playground simplifié

La page **Validation Zod** utilise désormais la surface réelle du module au lieu de handlers locaux incomplets. Elle :

- charge automatiquement les services détectés ;
- propose une liste de services plutôt qu’un champ libre lorsque cela est possible ;
- affiche l’état réel de la session ;
- résume le service, le nombre de champs et la dérive manifest/schéma ;
- conserve le JSON complet dans un panneau replié ;
- affiche l’endpoint appelé en cas d’erreur ;
- prévisualise un schéma avec ses champs courants au lieu d’envoyer un payload incomplet.

## Cohérence de configuration

`runtimeConfig.public._feathers.builder.enabled` reflète maintenant `feathers.console.enabled`. Lorsque la console est désactivée, les routes Builder ne sont ni annoncées ni enregistrées.

Le playground active explicitement la console en lecture seule :

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
  },
}
```

## Résolution fiable des dossiers de services

Les chemins `servicesDirs` absolus sont maintenant utilisés tels quels. Ils ne sont plus recombinés avec `projectRoot`. Cette correction évite qu’un scan de secours sélectionne par erreur un schéma homonyme dans `examples/` ou dans un autre sous-dossier du dépôt.

Les variantes suivantes pointent désormais vers le même fichier du projet courant :

- `GET /api/nfz/schema?service=users` ;
- `GET /api/nfz/schema/users` ;
- lecture et écriture du manifeste associé.

## Non-régression

La couverture vérifie :

- l’unicité des routes et des méthodes ;
- la présence de chaque handler runtime ;
- l’absence de copies privées sous `playground/server/api/nfz` ;
- les variantes `schema?service=...` et `schema/:service` ;
- la prévisualisation Builder sur un service réel ;
- la désactivation complète lorsque `console.enabled` vaut `false`.

## Validation finale

- 126 tests unitaires ;
- 57 tests d’intégration ;
- 5 tests bout en bout ;
- 188 tests réussis au total ;
- build du module, du CLI et du playground réussi ;
- contrôle HTTP du serveur de production réussi sur les cinq actions Builder utilisées par l’interface ;
- publication npm simulée sur le tarball exact.
