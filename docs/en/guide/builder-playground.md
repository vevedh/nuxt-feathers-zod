# Playground Builder validation

Phase **6.4.112** adds a real **`/builder`** playground page aligned with the module runtime contract.

## Goal

Validate that the Builder Studio surface in a consuming app no longer relies on raw HTTP calls, but uses the same auth/transport path as the other internal tools:

- `useProtectedPage()`
- `useBuilderClient()`
- `useAuthBoundFetch()` under the hood

## Validation page

The **`/builder`** playground page:

- reads builder metadata from `runtimeConfig.public._feathers.builder`
- protects the surface with `useProtectedPage()`
- consumes builder routes through `useBuilderClient()`
- renders readable JSON results for:
  - services
  - manifest
  - schema
  - preview

## Why this matters

This page is the validation surface to ensure that:

- the builder follows the same auth/runtime contract as Mongo management
- consuming apps do not call `/api/nfz/*` directly
- builder routes are discovered from public runtime config instead of being hardcoded everywhere

## Recommended flow

```ts
const page = useProtectedPage({ auth: 'required', reason: 'playground-builder' })
const builder = useBuilderClient()

await page.ensure()
const services = await builder.getServices()
```

## Scope of this phase

This phase validates the **client surface** and the **playground page**.
The actual builder server endpoints still belong to the application exposing those routes.
