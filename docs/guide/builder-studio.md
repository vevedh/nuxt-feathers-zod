# Builder Studio

Le **Builder Studio** est la surface de démonstration la plus importante pour faire comprendre NFZ.

## Ce qu'il doit montrer

- des presets officiels immédiatement compréhensibles
- une prévisualisation fidèle de la structure `services/`
- un passage simple du manifest au code généré
- un apply lisible vers un layout NFZ
- une **commande CLI approchante** pour expliquer la parité UI/CLI

## Presets officiels

### `mongoCrud`
Preset CRUD MongoDB standard pour montrer rapidement le pattern NFZ classique.

Champs starter : `title`, `status`, `publishedAt`.

### `mongoSecureCrud`
Même base que `mongoCrud`, mais orientée auth/policies futures.

Champs starter : `title`, `ownerId`, `visibility`.

### `memoryCrud`
Preset de démonstration sans dépendance Mongo.

Champs starter : `label`, `enabled`.

### `action`
Preset pour services métier non-CRUD et méthodes custom.

Champs starter : `command`, `payload`, `dryRun`.

## Démo recommandée

1. ouvrir `/builder-demo`
2. choisir un preset
3. basculer vers `/services-manager?preset=...`
4. montrer `shared`, `class`, `schema`, `hooks`, `service`
5. comparer la **commande CLI approchante**
6. lancer `dry-run`
7. lancer `apply`
8. terminer par `/auth-demo` pour `mongoSecureCrud`

## Objectif produit

Le Builder Studio doit rendre perceptible que NFZ n'est pas seulement un connecteur Nuxt, mais un **backend builder** pour Nuxt + Feathers.


## Nouveautés 6.4.62

- starters métier au-dessus des presets génériques
- option de génération d’un fichier `*.hooks.ts` séparé
- parité plus lisible entre preview builder et layout CLI NFZ


## Builder Studio 6.4.63

- barrels optionnels : `index.ts` dans le dossier service, et en option `services/index.ts`
- starter `users` rapproché des conventions NFZ local auth (`passwordHash`, masquage du mot de passe côté external resolver)
- apply builder plus proche d’un layout de démonstration CLI-first


## 6.4.64

- Builder Studio: `services/index.ts` peut maintenant être agrégé à partir de plusieurs services marqués `service+root`.
- Le preview et l'apply utilisent la liste complète du manifest pour produire un root barrel cohérent avec plusieurs services.


## 6.4.65
Le parcours **Services Manager** distingue désormais plus clairement les services **Démo builder**, les **Services scannés** et les **Brouillons libres**, afin de rendre les tests simples plus compréhensibles dans l'app de démonstration.


### 6.4.69

Le builder expose maintenant trois cartes d’entrée guidées pour choisir rapidement entre tests rapides, inspection des services réels et builder avancé.

## 6.4.71 — License Center
- documentation du License Center et des composants réutilisables de gestion de licence / feature gating pour les futures options premium de NFZ
