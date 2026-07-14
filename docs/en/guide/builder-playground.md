---
editLink: false
---
# Builder playground validation

The `/builder` page validates the Builder surface through the same Feathers client used by application services. It does not ship a private backend or call Nitro routes directly.

## Covered checks

The page can:

- discover project services;
- read the current manifest;
- load a selected service schema;
- preview a change without writing files;
- display the active session and published service paths;
- show complete payloads in a collapsible diagnostic panel.

```ts
const page = useProtectedPage({
  auth: 'required',
  reason: 'playground-builder',
})
const builder = useBuilderClient()

await page.ensure()
const services = await builder.getServices()
const schema = await builder.getSchema('users')
```

With authentication enabled, unauthenticated external calls must be rejected. With `allowWrite: false`, read and preview operations remain available while file updates are refused.

Recommended configuration for new applications:

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
    legacyNitroRoutes: false,
  },
}
```

Enable the legacy Nitro facades only while validating a migration from an older release.

<!-- release-version: 6.5.47 -->
