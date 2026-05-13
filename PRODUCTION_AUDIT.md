# Production audit — nuxt-feathers-zod 6.5.30

This audit summarizes the module structure, the CLI contract, the runtime surface and the documentation changes prepared for production publication.

## Scope

The archive was reviewed across the following areas:

- package metadata and public exports;
- Nuxt module definition;
- runtime options and defaults;
- CLI commands and generated service workflow;
- server, client and composable runtime APIs;
- authentication runtime and event diagnostics;
- VitePress documentation structure;
- production deployment guidance.

## Module structure

The module is declared through `defineNuxtModule` with:

- package name: `nuxt-feathers-zod`;
- configuration key: `feathers`;
- Nuxt compatibility: `^4.0.0`;
- default service directory: `services`;
- embedded and remote client modes;
- REST and Socket.io transport support;
- optional MongoDB, Swagger, DevTools, console and MCP surfaces.

The runtime is split into clear domains:

- `src/runtime/server*` for embedded server bootstrap and server utilities;
- `src/runtime/client*` for client creation and client plugins;
- `src/runtime/options/**` for normalized configuration;
- `src/runtime/composables/**` for public Nuxt composables;
- `src/runtime/server/api/nfz/**` for admin/builder-style runtime endpoints;
- `src/cli/**` for project initialization and service generation.

## CLI contract reviewed

The CLI supports:

- project diagnostics with `doctor`;
- initialization presets with `init embedded`, `init remote`, `init starter` and `init templates`;
- service generation with `add service`, `add file-service`, `add remote-service`, `add custom-service`;
- middleware and server module generation;
- MongoDB management scaffolding;
- schema inspection and schema editing helpers;
- template/plugin/module registry commands;
- authentication service helpers.

The documentation has been updated to match these commands and their current defaults.

## Runtime contract reviewed

The public runtime surface includes:

- `useFeathers()`;
- `useService()`;
- `useRawService()`;
- `useAuth()`;
- `useAuthRuntime()`;
- `useProtectedService()`;
- `useProtectedPage()`;
- `useMongoManagementClient()`;
- `useNfzAdminClient()`;
- server and client plugin helpers;
- Zod/query utilities;
- ObjectId and validation helpers.

A dedicated events reference was added to document authentication lifecycle events and the recommended Feathers hook model.

## Corrections applied

- README files rewritten for publication.
- CLI documentation updated from `6.5.29` to `6.5.30`.
- Generic placeholder wording removed from public documentation pages.
- Production readiness guide added in French and English.
- Runtime and services references rewritten for developer usage.
- Events and hooks reference added in French and English.
- VitePress navigation/sidebar updated.
- Duplicate CLI help line for `--payloadMode` removed.
- Duplicate derived `accessToken` assignment removed from the authentication runtime.

## Production recommendations

Before publishing a release or deploying an application:

1. Run `bunx nuxt-feathers-zod doctor`.
2. Run Nuxt type generation and type checking.
3. Build the documentation.
4. Validate embedded mode with at least one generated service.
5. Validate remote mode with token restoration and one protected service.
6. Validate Keycloak remote flow where enabled.
7. Keep MongoDB destructive operations disabled by default.
8. Verify all secrets are read from runtime environment variables.
9. Confirm the public runtime config exposes only non-sensitive values.
10. Run smoke scenarios for authentication, protected routes and service CRUD.

## Notes for maintainers

The module is ready for a clearer production-facing documentation pass. The next high-value improvements are:

- automated CLI command snapshot tests;
- documentation examples tested against a minimal fixture;
- an explicit migration guide between minor versions;
- a typed event contract exported for dashboards and diagnostics.
