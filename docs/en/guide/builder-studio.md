---
editLink: false
---
# Builder Studio

Builder Studio demonstrates how a service moves from a manifest and Zod schema to generated Feathers code. Its runtime operations use the `nfz/*` Feathers services, so authentication, validation, errors and transports match the rest of the application.

## Suggested demonstration

1. discover the services with `nfz/services.find()`;
2. read a schema with `nfz/schemas.get()`;
3. preview a change with `nfz/builder.create({ action: 'preview' })`;
4. compare the preview with the CLI command;
5. enable writes only in a protected development environment;
6. apply the change and review the generated files.

## Safety model

- Service names and field definitions are validated before filesystem access.
- Preview operations remain available with `allowWrite: false`.
- Write operations require `console.allowWrite: true`.
- Authentication hooks protect external calls when authentication is enabled.
- Legacy Nitro routes are optional compatibility facades and contain no Builder logic.

## Recommended configuration

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
    legacyNitroRoutes: false,
  },
}
```

Keep Builder administration separate from business screens and record every applied change in the project repository.

<!-- release-version: 6.5.47 -->
