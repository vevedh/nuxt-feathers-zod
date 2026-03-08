---
editLink: false
layout: false
---
# Official example: `actions` (golden sample)

The `services/actions` service is the official **golden sample** for a CLI-generated **adapter-less service with custom methods**.

Why keep it in the repository?
- immediate demo (playground page `/actions`)
- code reference (auth + Zod + custom `run` method)
- regression detector (templates/CLI)

> Rule: `actions` must never drift from the generated output of `add service actions --custom`.

---

## Regenerate `actions` (recommended)

From the repo root:

```bash
bun install
bun run sync:actions
```

It runs:

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run --auth --docs --force
```

- `--force` overwrites `services/actions/*` (by design).
- Run it whenever templates change.

---

## Quick checks

After regeneration:

- `services/actions/actions.ts` must validate `run` result via an **around hook**
- `/actions` UI should call `run` without errors.
