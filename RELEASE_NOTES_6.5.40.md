# nuxt-feathers-zod 6.5.40

## Documentation, CLI and playground coherence

Version 6.5.40 aligns the repository around the Feathers-first runtime introduced in 6.5.38.

### Playground

- Fix the Builder console service selector by consuming `nfz/services.find()` through `useBuilderClient()`.
- Normalize the real discovery shape `{ name, source }` before selecting a service.
- Load schemas through `nfz/schemas.get()` and persist them through `nfz/schemas.patch()`.
- Move the RBAC console to `nfz/status`, `nfz/services` and `nfz/rbac` Feathers services.
- Disable write actions in the UI when `console.allowWrite` is false.
- Remove obsolete unpublished console page sources that still called `/api/nfz/**`.

### CLI

- Add `capabilities` with `summary`, `runtime`, `services`, `client`, `events` and `all` sections.
- Export the capability matrix through `nuxt-feathers-zod/capabilities`.
- Generate the FR/EN CLI reference from the real Citty command tree.
- Simplify root help so it lists the actual command groups and delegates exact flags to command help.
- Run unit and integration suites without file-level parallelism to avoid lingering Vitest workers in constrained and Windows environments.
- Remove an unreferenced legacy CLI initialization implementation.
- Avoid the duplicate npm pack build by skipping `prepare:project` during `npm pack` and `npm publish` after the full `prepack` gate has completed.

### Documentation

- Reorganize VitePress around overview, getting started, architecture, configuration, CLI, playground, production and reference.
- Publish the playground guide in production instead of excluding a page linked from the public navigation.
- Rewrite the core FR/EN technical reference from the real module process and current runtime.
- Document the 13 `ModuleOptions` top-level keys, NFZ services, composables, auth events and lifecycle phases.
- Correct unsupported CLI examples and schema field syntax.
- Clarify that `console.enabled` registers Feathers services and does not inject Vue console pages into consumer applications.

### Coherence gate

`bun run sanity:project-coherence` now checks:

- generated CLI reference against `createCliCommand()`;
- documentation coverage for all `ModuleOptions` keys;
- documentation coverage for exported composable functions;
- NFZ service paths against the service capability matrix;
- authentication event coverage;
- playground route coverage;
- Feathers-first usage in Builder and RBAC console pages;
- absence of obsolete runtime console pages.
- internal documentation links against existing VitePress pages.

<!-- release-version: 6.5.40 -->
