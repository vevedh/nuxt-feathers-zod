# Services

Services are the core of the module. They expose Feathers methods and carry the business contract of the application.

## Recommended creation flow

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

The CLI creates a structure that matches the module scanner and updates the `.nfz` manifest.

## Standard methods

A Feathers service may expose:

- `find`;
- `get`;
- `create`;
- `update`;
- `patch`;
- `remove`.

The actual available methods depend on the generated service and selected options.

## Custom methods

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find,run --customMethods run
```

Custom methods must be declared on both the service and the client side. This avoids transport errors, especially across SSR, REST and Socket.io.

## Schemas

The recommended mode for business services is `zod`.

```bash
bunx nuxt-feathers-zod add service tasks --schema zod
```

The module also supports lighter modes:

- `none` for a minimal service;
- `json` for a JSON-oriented description;
- `zod` for a stronger TypeScript and runtime contract.

## Hooks

Feathers hooks should be used for:

- authentication;
- RBAC rules;
- business validation;
- data enrichment;
- auditing;
- business events.

```ts
export default {
  before: {
    all: [],
    find: [],
    create: [],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
}
```

## Best practices

- Generate services with the CLI.
- Keep hooks close to the service.
- Define exposed methods clearly.
- Hide sensitive fields in external resolvers.
- Version the `.nfz` manifest.
- Prefer domain composables or stores for sensitive pages.
