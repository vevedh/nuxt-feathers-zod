# NFZ manifest schema model

The CLI should keep service schema state in a manifest-first model.

Current storage introduced by Patch 1:
- `services/.nfz/manifest.json`
- `services/.nfz/services/<service>.json`

Service manifest shape:

```json
{
  "name": "users",
  "path": "users",
  "adapter": "mongodb",
  "auth": true,
  "custom": false,
  "idField": "_id",
  "collectionName": "users",
  "schema": {
    "mode": "zod",
    "fields": {
      "_id": { "type": "id", "required": true },
      "userId": { "type": "string", "required": true },
      "password": { "type": "string", "required": true, "secret": true }
    }
  }
}
```

Rule: code files are generated projections; the manifest is the durable source of truth for CLI mutations.


## Patch 2 note
Field-level mutations are applied to the manifest first, then projected back into generated service files.
This keeps `schema.mode` and `schema.fields` as the canonical editable state.


## Patch 3 note
Manifest diffs are now a first-class CLI concern. Field and mode mutations should compute a before/after manifest summary before writing files when `--diff` is requested.
