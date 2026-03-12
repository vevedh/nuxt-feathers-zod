---
editLink: false
---
# Open core vs Pro

This page clarifies the recommended product boundary.

## Standard open source

The open source core should stay focused on:

- embedded / remote runtime
- REST / Socket.IO transports
- Express / Koa
- local / JWT auth
- Keycloak bridge
- official CLI
- service generation
- remote-service registry
- `auth service` to enable or disable auth hooks
- `add mongodb-compose` for local MongoDB bootstrap
- server modules and Express presets
- optional `database.mongo.management` layer
- optional legacy Swagger
- template overrides
- validation playground

## Good Pro / license-key candidates

These can later become licensed features:

- advanced visual console
- advanced builder / init wizard
- enriched NFZ DevTools
- ready-to-use RBAC / policy packs
- advanced diagnostics and diffing
- secured discovery / inventory
- enterprise presets
- business-oriented template packs

## Simple rule

The open source core should remain:

- testable
- documented
- reproducible
- free of license gating for essential flows
- stable on Bun/Windows for the public CLI
