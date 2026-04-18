# Roadmap NFZ vNext

Cette roadmap reprend le comparatif NFZ vs `@nuxtjs/supabase` et le transforme en lots de travail concrets.

## Lot 1 — DX d’entrée

- starters officiels : `hello-service`, `auth-local`, `admin-dashboard`, `remote-keycloak`
- docs “5 minutes” plus courtes
- API publique client/auth/service plus canonique

## Lot 2 — Auth démontrable

- composable `useAuth()` unique et stable
- matrice de compatibilité `embedded|remote × local|jwt|keycloak`
- page démo auth officielle

## Lot 3 — Builder / services-manager

- stabilisation complète de l’expérience builder
- méthodes activées par service
- `idField`
- presets
- apply réel vers une structure `services/` NFZ
- alignement strict CLI/UI

## Lot 4 — Diagnostics

- filtres par service/méthode/provider
- export JSON
- vue runtime (mode/auth/transport/servicesDirs)
- meilleure lisibilité des erreurs auth et hydratation

## Lot 5 — Démonstration et adoption

- pages démo CRUD / auth / diagnostics / Mongo / builder
- presets officiels
- docs de comparaison et d’adoption

## Lot 6 — Enterprise

- RBAC / policies standardisées
- remote mode durci
- intégration SSO exemplaire
- multi-instance plus tard seulement
