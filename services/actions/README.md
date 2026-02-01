# Custom service template (Zod-first) — with a custom "action" method

This folder contains a **copy/paste** template to create a Feathers v5 service that exposes:

- standard method(s): `find`
- **custom method**: `run` (a "RPC-like action" endpoint)

It is compatible with **nuxt-feathers-zod** auto-registration:

- Server auto-scan picks up `actions.ts` (single suffix `.ts`)
- Client auto-scan picks up `actions.shared.ts`
- Types auto-scan can pick up `actions.schema.ts`

## How to use

1. Copy this folder to your real services directory, e.g.

```
services/actions/
  actions.ts
  actions.shared.ts
  actions.class.ts
  actions.schema.ts
```

2. Rename `actions` everywhere if you want another service name (path + identifiers).

3. Ensure your Nuxt config points `feathers.servicesDirs` to the directory containing your services.

## Calling the custom method

On the client (Nuxt):

```ts
const api = useNuxtApp().$api
const res = await api.service('actions').run({ action: 'reindex' })
```

The method exists because it is declared in **both**:

- server `methods: ['find', 'run']`
- client `methods: ['find', 'run']`
