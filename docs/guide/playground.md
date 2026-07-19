# Découvrir le module avec le playground

Le playground est une application Nuxt complète qui montre les fonctions du module dans un navigateur. Utilisez-le pour comprendre un parcours avant de reproduire la configuration dans votre projet.

## Démarrer

Depuis le dépôt source :

```bash
bun install --frozen-lockfile
bun run dev
```

Ouvrez ensuite l’adresse affichée par Nuxt.

## Tableau de bord

Le tableau de bord contrôle la configuration Nuxt, le client Feathers, un service public, l’authentification, un service protégé et l’hydratation SSR.

![Contrôles rapides du playground](/images/guides/playwright/playwright-dashboard.png)

Le bouton **Lancer les contrôles rapides** ne modifie aucune donnée persistante.

## Diagnostic de connexion et de session

La page **Tests essentiels** vérifie d’abord un service, puis une session locale. Elle affiche le résultat utile pour diagnostiquer un problème de transport ou d’authentification.

![Diagnostic des services et de l’authentification](/images/guides/playwright/playwright-diagnostics.png)

## Parcours utiles

Chaque route correspond à un écran réel du playground. Les pages de diagnostic restent accessibles sans session ; les pages métier protégées demandent une authentification lorsque leur scénario l’exige.

| Route | Page | Ce que vous pouvez tester |
|---|---|---|
| `/` | Tableau de bord | état général et contrôles rapides |
| `/tests` | Tests essentiels | service, session locale et token |
| `/validation` | Validation Zod | schémas et erreurs de validation |
| `/messages` | Messages | CRUD Feathers protégé |
| `/actions` | Actions | méthode personnalisée de service |
| `/mongo` | MongoDB | diagnostic de connexion et administration lorsque MongoDB est activé |
| `/builder` | Builder | aperçu des fonctions de génération |
| `/auth-runtime` | Authentification | principal, événements et provider |
| `/embedded` | Mode embedded | backend Feathers intégré à Nuxt |
| `/remote/rest` | REST distant | connexion HTTP à une API distante |
| `/remote/socketio` | Socket.IO distant | transport temps réel et reconnexion |
| `/middleware` | Middleware serveur | ordre des modules, plugins et services |
| `/ldapusers` | Service distant | exemple de service ldapusers |
| `/mongos` | Service mongos | lecture Feathers et état Pinia |
| `/console/builder` | Console Builder | console de génération NFZ |
| `/console/rbac` | Console RBAC | rôles et capacités |

## Captures fiables

Les images de cette documentation sont produites par les scénarios Playwright du playground. Une capture n’est mise à jour qu’après la réussite des assertions fonctionnelles associées.

## Données de démonstration

Le playground utilise uniquement des identités et secrets de test. Ne recopiez jamais ces valeurs dans un environnement de production.

<!-- release-version: 6.6.0 -->
