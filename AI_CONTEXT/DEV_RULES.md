# Development Rules

Always follow these rules when modifying the project.

1. Services must use Zod schemas first
2. CLI commands must work with Bun
3. Embedded mode must remain fully functional , mongodb must load before services
4. Remote mode must support REST and SocketIO and not create .nuxt/feathers/server/**
5. Server modules must use defineFeathersServerModule
6. Runtime code must remain Nuxt Nitro compatible
7. Do not introduce dependencies without justification
8. Documentation must stay aligned with runtime behaviour and cli behaviour

## PATCH fix11

- Template safety stabilization: corrected remaining nested template interpolation in CLI-generated `healthcheck.ts` preset module.
- Generated code now uses string concatenation (`basePath + '/health'`) instead of nested template literals inside the emitter template, preventing silent runtime generation bugs.
- Added `scripts/template-safety-check.mjs` and `bun run sanity:templates` to catch this class of fragile template regressions early.
- fix18 runtime cleanup: avoid runtime plugin `dependsOn: ['pinia']` for NFZ auth bootstrap; guard on `nuxtApp.$pinia` instead. Builtin server modules (`cors`, `helmet`, `compression`, `body-parser`, `serve-static`, `healthcheck`, `rate-limit`, `secure-defaults`) must resolve deterministically without `scanExports()` when the id is known. Shared remote auth payload logic is exposed through alias `nuxt-feathers-zod/auth-utils`.
