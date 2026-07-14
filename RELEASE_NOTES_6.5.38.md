# nuxt-feathers-zod 6.5.38

## Feathers-first Builder and diagnostics

The Builder, schema console and diagnostics now use canonical Feathers services instead of Nitro API routes:

- `nfz/services`
- `nfz/schemas`
- `nfz/manifest`
- `nfz/builder`
- `nfz/status`
- `nfz/rbac`
- `nfz/presets`
- `nfz/init`

`useBuilderClient()` calls these services through the injected Feathers client. The same contracts work through direct server calls, REST and Socket.IO.

## Backward compatibility

The historical `/api/nfz/**` routes remain available by default throughout the 6.x line. They are now thin deprecated facades that delegate to the Feathers services and return deprecation headers.

New projects can disable them:

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
    legacyNitroRoutes: false,
  },
}
```

## Security

- External calls reuse Feathers authentication hooks.
- Keycloak bridge calls require a resolved user.
- Service names, field definitions and commands are validated with Zod.
- Prototype-pollution keys and oversized object graphs are rejected before parsing.
- Filesystem writes still require `console.allowWrite: true`.
- Service directory resolution preserves absolute paths.

## Runtime and packaging

- Internal preset helpers now live under the published server runtime, preventing unresolved imports in consumer builds.
- Public runtime metadata advertises Feathers service paths separately from legacy Nitro routes.
- A new `sanity:feathers-first-console` gate prevents business logic from returning to compatibility handlers.
- Package exports include `nuxt-feathers-zod/server-console-services`.

## Validation coverage

The release covers:

- direct Feathers service calls;
- authenticated and unauthenticated REST calls;
- Socket.IO access;
- legacy Nitro delegation and deprecation headers;
- read-only write protection;
- unsafe input rejection;
- module, CLI and playground builds;
- isolated E2E specifications so each Nuxt server is started and stopped in its own process.
