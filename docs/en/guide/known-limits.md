---
editLink: false
---
# Known limits

This page documents the explicit limits of the current open source core.

## Functional limits

- the **advanced console** is not frozen as part of the open source core
- the **visual builder** is not part of the public stable contract
- advanced **business presets** are not yet part of the frozen surface
- enriched **remote discovery** is not a standardized core workflow yet

## Method limits

- manual service creation is possible, but **not the recommended path** when starting
- `init` commands patch `nuxt.config.ts` most reliably when the file keeps a standard structure
- complex auth scenarios still require end-to-end validation

## Documentation limits

- the documentation intentionally focuses on the **standard core**
- features still being stabilized should stay outside the main quick-start paths

## Stability rule

If a capability does not have:

- a clear CLI flow,
- a reproducible example,
- tested behavior,
- and aligned documentation,

it should not be marketed as a core pillar yet.
