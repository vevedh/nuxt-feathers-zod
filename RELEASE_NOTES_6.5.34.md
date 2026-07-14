# nuxt-feathers-zod 6.5.34

Cette version consolide le runtime embarqué puis réduit le coût de démarrage du CLI, sans modifier la configuration historique de l’instance `default`.

## Runtime plus déterministe

Le serveur attend désormais la fin de `app.setup()` et l’initialisation du routeur Socket.IO avant d’accepter le trafic Feathers. Le bridge REST répond avec un statut 503 explicite pendant une initialisation incomplète ou après un échec de démarrage.

La fermeture est idempotente : Feathers est arrêté, puis le client MongoDB est fermé. Les secrets MongoDB et Keycloak sont lus dans la configuration privée au démarrage et ne sont plus injectés directement dans les templates générés.

## CLI plus léger

L’aide et les types partagés ont été séparés du cœur des générateurs. Les commandes lourdes et le diagnostic sont chargés à la demande. Le build CLI produit plusieurs chunks ESM et applique des budgets de taille et de temps de démarrage.

## Validation élargie

Les tests sont répartis entre suites unitaires, intégration et bout en bout. La CI ne modifie plus les sources et contrôle également la convergence des dépendances, les secrets dans les templates, l’hygiène de l’archive et la cohérence de la documentation.

## Documentation

Les pages publiques et les journaux techniques ont été nettoyés et reformulés dans un style direct. Les images PNG surdimensionnées de la page d’accueil ont été remplacées par des SVG légers.
