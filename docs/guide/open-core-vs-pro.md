---
editLink: false
---
# Open core vs Pro

Cette page clarifie la frontière produit recommandée.

## Open source standard

Le socle open source doit rester centré sur :

- runtime embedded / remote
- transports REST / Socket.IO
- Express / Koa
- auth locale / JWT
- bridge Keycloak
- CLI officielle
- génération de services
- remote-service registry
- server modules
- Swagger legacy optionnel
- template overrides
- playground de validation

## Bons candidats Pro / licence key

Ces axes peuvent être proposés plus tard comme fonctionnalités sous licence :

- console visuelle avancée
- builder / init wizard avancé
- DevTools NFZ enrichis
- packs RBAC / policies prêts à l’emploi
- diagnostics avancés et diffing
- discovery / inventory sécurisée
- presets enterprise
- packs de templates métier

## Règle simple

Le core open source doit rester :

- testable
- documenté
- reproductible
- sans dépendance à une licence pour les parcours essentiels
