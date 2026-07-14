---
editLink: false
---
# Open core vs Pro

Cette page clarifie la frontière produit recommandée.

## Standard open source

Le core open source doit rester concentré sur :

- runtime embedded / remote
- transports REST / Socket.IO
- Express / Koa
- auth locale / JWT
- bridge Keycloak
- CLI officielle
- génération de services
- registre remote-service
- `auth service` pour activer/désactiver les hooks auth
- `add mongodb-compose` pour le bootstrap local MongoDB
- server modules et presets Express
- couche optionnelle `database.mongo.management`
- Swagger legacy optionnel
- template overrides
- playground de validation

## Bons candidats Pro / licence

Ces éléments peuvent plus tard devenir des fonctionnalités sous licence :

- console visuelle avancée
- builder / init wizard avancé
- NFZ DevTools enrichis
- packs RBAC / policies prêts à l’emploi
- diagnostics et diffing avancés
- discovery / inventory sécurisée
- presets enterprise
- packs de templates orientés métier

## Règle simple

Le core open source doit rester :

- testable
- documenté
- reproductible
- sans blocage licence sur les parcours essentiels
- stable sur Bun/Windows pour la CLI publique
