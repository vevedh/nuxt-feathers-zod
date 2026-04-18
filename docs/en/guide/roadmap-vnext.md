# NFZ vNext roadmap

This roadmap turns the NFZ vs `@nuxtjs/supabase` comparison into concrete workstreams.

## Batch 1 — Entry DX

- official starters: `hello-service`, `auth-local`, `admin-dashboard`, `remote-keycloak`
- shorter “5 minute” docs
- clearer public client/auth/service API

## Batch 2 — Demonstrable auth

- one canonical `useAuth()` composable
- compatibility matrix `embedded|remote × local|jwt|keycloak`
- official auth demo page

## Batch 3 — Builder / services-manager

- fully stable builder UX
- enabled methods per service
- `idField`
- presets
- real apply to NFZ `services/`
- strict CLI/UI alignment

## Batch 4 — Diagnostics

- filters by service/method/provider
- JSON export
- runtime view (mode/auth/transport/servicesDirs)
- clearer auth and hydration error surfaces

## Batch 5 — Demo and adoption

- demo pages for CRUD / auth / diagnostics / Mongo / builder
- official presets
- comparison and adoption docs

## Batch 6 — Enterprise

- standardized RBAC / policies
- hardened remote mode
- exemplary SSO integration
- multi-instance later only
