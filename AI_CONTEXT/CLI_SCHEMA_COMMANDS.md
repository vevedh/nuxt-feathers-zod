# CLI schema commands

## Patch plan baseline

The NFZ CLI now evolves toward a manifest-first schema management workflow.

Phase 1 commands:
- `schema <service> --show`
- `schema <service> --json`
- `schema <service> --export`
- `schema <service> --get` (compatibility alias of `--show`)
- `schema <service> --set-mode zod|json|none`

Display rules:
- `--show` = human-readable summary
- `--json` = machine-readable output
- `--export` = write the current summary to `services/.nfz/exports`
- `--get` = transitional alias of `--show`, to deprecate later

Next phases:
- Patch 2: `--add-field`, `--remove-field`, `--set-field`, `--rename-field`
- Patch 3: `--force`, `--diff`, `--dry`, auth safeguards for `users --auth`


## Patch 2 — Field mutations
The `schema <service>` command now supports manifest-first field mutations:
- --add-field <spec>
- --remove-field <name>
- --set-field <spec>
- --rename-field <from:to>

Compact field syntax examples:
- userId:string!
- password:string!
- isActive:boolean=true
- roles:string[]

Patch 2 only mutates fields and re-renders artifacts from the manifest.
Auth protections and diff/dry safeguards are planned in Patch 3.


## Patch 3 — auth guards + diff/dry
Patch 3 adds:
- `--diff` to print manifest-level changes before regeneration
- stronger `--dry` behavior by combining dry-run writes with diff output
- `--force` as an explicit override for protected auth-enabled users mutations

Guard rules for `users --auth`:
- switching schema mode to `json` or `none` requires `--force`
- removing `userId` or `password` requires `--force`
- renaming `userId` or `password` requires `--force`
- modifying `userId` or `password` with `--set-field` requires `--force`

## Patch 4 — auth repair + validation
Patch 4 adds repair/validation helpers for auth-enabled `users` service:
- `--validate`
- `--repair-auth`

Behavior:
- `--validate` checks auth compatibility invariants
- `--repair-auth` restores a safe auth baseline:
  - schema mode => `zod`
  - `userId:string!`
  - `password:string!` with `secret: true`

Display rules:
- `--show` now includes `Auth compatibility: yes|no|n/a`
- when broken, `--show` lists auth issues directly

## users --auth special behavior
When a service manifest has `name=users` and `auth=true`, schema generation must use the auth-aware renderer.
This applies to:
- `add service users --auth`
- manifest apply/regeneration
- `--repair-auth`
