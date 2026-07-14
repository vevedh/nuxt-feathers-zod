# Validation du Builder dans le playground

La page `/builder` vérifie la surface Builder telle qu’elle sera utilisée dans une application Nuxt. Elle ne possède pas de backend privé et ne contourne pas Feathers.

## Parcours couvert

La page permet de :

- lister les services découverts ;
- lire le manifeste courant ;
- choisir un service et lire son schéma ;
- prévisualiser une évolution sans écrire de fichier ;
- contrôler la session et les chemins de services réellement publiés ;
- consulter le résultat complet dans un panneau JSON repliable.

## Flux client

```ts
const page = useProtectedPage({
  auth: 'required',
  reason: 'playground-builder',
})
const builder = useBuilderClient()

await page.ensure()
const discovery = await builder.getServices()
const schema = await builder.getSchema('users')
```

`useBuilderClient()` appelle les services `nfz/*` par le client Feathers injecté. L’authentification, les erreurs, les hooks et le transport suivent donc le même chemin que les services métier.

## Ce que le test doit confirmer

Après connexion, les actions de la page doivent vérifier que :

1. `nfz/services.find()` retourne les services du projet courant ;
2. `nfz/schemas.get(<service>)` résout le bon fichier dans `servicesDirs` ;
3. `nfz/manifest.get('current')` lit le manifeste sans dépendre d’une route Nitro ;
4. `nfz/builder.create({ action: 'preview' })` produit une prévisualisation en lecture seule ;
5. un appel sans session est refusé lorsque l’authentification est active.

Les anciennes routes `/api/nfz/**` sont affichées uniquement comme compatibilité lorsqu’elles sont activées. Elles ne constituent plus le contrat principal du playground.

## Configuration recommandée

```ts
export default defineNuxtConfig({
  feathers: {
    console: {
      enabled: true,
      allowWrite: false,
      legacyNitroRoutes: false,
    },
  },
})
```

Active `legacyNitroRoutes` seulement pour vérifier une migration depuis une version antérieure.

<!-- release-version: 6.5.41 -->
