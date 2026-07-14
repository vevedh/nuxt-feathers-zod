# nuxt-feathers-zod 6.5.36

Cette version transforme le playground en centre de validation lisible et responsive, sans modifier les contrats runtime du module ni ajouter de dépendance UI au package publié.

## Tableau de bord central

La page d’accueil affiche désormais le scénario actif, le mode client, l’état de session et la version du module. Un bouton lance six contrôles non destructifs : injection du client, état du runtime, découverte des services, initialisation de l’authentification, appel Feathers et disponibilité MongoDB.

Les services protégés sont signalés comme « à vérifier » lorsqu’une session est requise. Ils ne sont plus présentés comme des pannes du module.

## Navigation et présentation communes

Le playground utilise une coque responsive unique avec navigation regroupée en parcours principal, fonctions métier, runtime/transports et outils avancés. Elle fonctionne sur écran large comme sur mobile, prend en charge le thème sombre du système et affiche le scénario courant dans la barre latérale.

Les pages principales partagent désormais les mêmes cartes, badges d’état, formulaires, tableaux et panneaux JSON repliables. Les payloads techniques restent disponibles mais ne masquent plus les actions utiles.

## Parcours essentiels simplifiés

Les pages suivantes ont été réorganisées :

- connexion et authentification ;
- messages et CRUD protégé ;
- méthode personnalisée `actions.run()` ;
- gestion MongoDB ;
- validation Zod et Builder ;
- runtime d’authentification ;
- modes embedded, REST et Socket.IO ;
- ordre des modules, plugins et hooks ;
- service distant `ldapusers` ;
- service Pinia/Feathers `mongos`.

La matrice `/validation` peut être filtrée entre scénarios embedded et distants. Le scénario actif est ouvert automatiquement.

## Documentation et couverture

`playground/README.md` et `playground/SCENARIOS_VALIDATION.md` décrivent maintenant un parcours de test concret, les commandes Windows fiables et les variables d’environnement de chaque scénario.

Un test d’intégration protège la présence du layout responsive, du tableau de bord, des contrôles rapides et des panneaux de diagnostic réutilisables.


## Build reproductible

`bun run playground:build` utilise désormais l'API programmatique de Nuxt, ferme explicitement les hooks après compilation et désactive MongoDB en mémoire pendant une simple construction lorsqu'aucune configuration explicite n'est fournie. Le build ne dépend donc plus du téléchargement d'un binaire MongoDB. Le mode développement conserve MongoDB en mémoire par défaut pour les essais fonctionnels.
