---
editLink: false
---
# Custom services & custom methods

A **custom service** is a Feathers service **without an adapter** (no Mongo/SQL).
It usually exposes business methods like `run`, `execute`, `status`, etc.

Typical use cases:
- business actions (reindex, purge, import, export)
- orchestration / DevOps automation
- third‑party APIs (Stripe, OVH, …)
- batch jobs

---

## Generate via CLI (recommended)

```bash
bunx nuxt-feathers-zod add custom-service actions   --methods find   --customMethods run   --auth   --docs
```

The generator creates:
- `actions.schema.ts` (Zod + types)
- `actions.class.ts` (implementation, includes `run()`)
- `actions.ts` (server registration via `app.use`)
- `actions.shared.ts` (client registration + typing + SSR-safe behavior)

---

## Usage in Nuxt

```ts
const actions = useService('actions')

await actions.find()
await actions.run({ action: 'reindex', payload: { full: true } })
```

---

## Internal behavior (important)

### 1) SSR-safe

During SSR, the client must **not** register `run` in `methods`
if the REST transport does not expose `remote.run` natively.

Rule:
- SSR: `methods: ['find']` (native only)
- Browser: patch `run()` then register `methods: ['find','run']`

### 2) Transport‑agnostic

In `*.shared.ts`, the custom method is attached using the best available option:

1. `remote.run` if already present
2. `remote.request` (REST custom method)
3. `remote.send` (socket low-level)
4. HTTP fallback via `$fetch` to:

```txt
POST {restUrl}{restPrefix}/{servicePath}/{method}
```

`restUrl` and `restPrefix` are read from:

- `useRuntimeConfig().public.feathers.rest.path`
- `useRuntimeConfig().public.feathers.restUrl`

---

## Common errors (and how to avoid them)

### ❌ `Can not apply hooks. 'run' is not a function`

Cause:
- you register `run` in `methods` on the client
- but `remote.run` does not exist (SSR/REST)

Fix:
- do not include `run` during SSR
- patch `run` before `client.use()` in the browser

### ❌ `Custom method "run" is not available on the client service`

Cause:
- `methods` does not include `run`, or connection is not REST, or patch was not applied

Fix:
- in the browser: `client.use(path, remote, { methods: ['find','run'] })` **after patch**
- ensure `runtimeConfig.public.feathers.rest.path` is correct

---

## Best practices

- keep custom services mostly stateless
- always validate `data` and `result` using Zod
- keep transport‑agnostic logic in `*.shared.ts`
- never hardcode `/feathers`: read from runtime config


## Generate via CLI (v6.2+)

Starting with **v6.2**, the CLI can generate a *custom service* (no adapter) directly:

```bash
bunx nuxt-feathers-zod add custom-service jobs --methods find --customMethods run --auth --docs
```

Useful options:
- `--methods`: standard Feathers methods (CSV), e.g. `find,get`
- `--customMethods`: custom methods (CSV), e.g. `run,execute`
- `--path`: exposed path (defaults to service name)
- `--auth`: protect with JWT
- `--docs`: enable swagger legacy integration (if available)

Then test in the playground:
- UI page if you have one (`/jobs`)
- or REST: `POST /feathers/jobs/run` (Bearer token)



## Official example (golden sample)

The repository keeps an `actions` service as the official **golden sample**.
See: [`actions` (golden sample)](/en/guide/golden-sample-actions).
