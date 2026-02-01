---
editLink: false
---
# Swagger (legacy)

Swagger UI integration is optional and provided through `feathers-swagger`.

## Install

```bash
bun add feathers-swagger swagger-ui-dist
```

## Validated setup notes

- Do **not** set `docsJsonPath` in `swagger({ ... })` (keep default behavior)
- Swagger UI uses `/swagger.json` by default
- If the UI is served at `http://localhost:3000/feathers/docs/`, set the spec URL in the UI to `../swagger.json`
- The `swaggerInitBlock` must be placed **before** `app.nitroApp = nitroApp;` in `src/runtime/templates/server/plugin.ts`
