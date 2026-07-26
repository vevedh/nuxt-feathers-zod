---
editLink: false
---
# Doctor

The `doctor` command validates coherence between Nuxt configuration, embedded discovery, bootstrap phases and the Zod runtime boundary.

```bash
bunx nuxt-feathers-zod doctor
```

## Embedded diagnostics

The doctor reports deterministic service sources, plugin counts and the effective load order. It fails when:

- `servicesDirs` discovers services but `loadOrder` omits `services`;
- a server plugin manually imports a registrar that is already discovered;
- the application declares or resolves Zod 4;
- application schemas and NFZ validators resolve different active Zod runtimes.

## Zod diagnostics

The output includes the declared range, detected copy count, active application path, active NFZ validator path and compatibility status. Unrelated transitive copies are listed but only active incompatible boundaries are blocking.

## After structural changes

```bash
bunx nuxt-feathers-zod doctor
bun run typecheck
bun run build
```

Keep `servicesDirs` as the single business registrar source and preserve the standard load order. Use plugins only for cross-cutting infrastructure.

<!-- release-version: 6.7.37 -->
