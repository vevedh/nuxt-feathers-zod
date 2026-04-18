# Admin client runtime helper

Phase **6.4.109** introduces `useNfzAdminClient()` for **diagnostics** and **DevTools** surfaces.

## Why

The module already had a solid auth-aware helper for Mongo:

- `useMongoManagementClient()`
- `useProtectedTool()`
- `useAuthBoundFetch()`

This phase applies the same principle to NFZ internal admin routes.

## What `useNfzAdminClient()` does

The composable relies on `useAuthBoundFetch()` and reads public route metadata from `runtimeConfig.public._feathers.admin`.

It provides auth-aware access to:

- `__nfz-devtools.json`
- `__nfz-devtools`
- `__nfz-devtools.css`
- `__nfz-devtools-icon.png`

## Example

```ts
const admin = useNfzAdminClient()

const payload = await admin.getDevtoolsJson()
const diagnostics = await admin.getDiagnostics()
```

## Public metadata exposed

The module now adds the following shape under `runtimeConfig.public._feathers`:

```ts
{
  admin: {
    diagnostics: {
      enabled: true,
      path: '/__nfz-devtools',
      jsonPath: '/__nfz-devtools.json',
      format: 'nfz-devtools-payload'
    },
    devtools: {
      enabled: true,
      path: '/__nfz-devtools',
      jsonPath: '/__nfz-devtools.json',
      cssPath: '/__nfz-devtools.css',
      iconPath: '/__nfz-devtools-icon.png'
    }
  }
}
```

## Current limit

This phase only covers **diagnostics + devtools**.

A dedicated **Builder Studio** helper comes next.
