---
editLink: false
---
# Playground

`playground/` is used to quickly validate the module open source core.

## What it helps verify

- embedded build
- remote build
- REST / Socket.IO connectivity
- local / remote / Keycloak auth
- behavior of a generated service

## Useful pages

- `/tests`: connection + auth diagnostics
- `/messages`: simple CRUD example
- `/ldapusers`: example of an explicitly declared remote service

## Recommended validation routine

### 1) Validate the module build

```bash
bun run build
```

### 2) Start the playground

```bash
bun dev
```

### 3) Check `/tests`

Useful checks:

- `find()` call on a declared service
- local auth
- token payload auth
- Keycloak SSO if enabled

## Why the playground matters

To freeze the open source core, it should remain a simple and stable validation ground.


## Toggle MongoDB memory in remote-only runs

If you only want to validate remote mode without starting `mongodb-memory-server`, set `NFZ_PLAYGROUND_EMBEDDED_MONGODB=false`.
The default remains `true` so the embedded MongoDB scenario stays available out of the box.
