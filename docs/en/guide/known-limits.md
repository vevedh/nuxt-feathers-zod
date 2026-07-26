---
editLink: false
---
# Known limits

This page documents the deliberate limits of the current open-source core.

## Functional limits

- the **advanced console** is not frozen as a final public core contract;
- the **visual builder** is not part of the stable public contract;
- advanced business presets are not yet contractual;
- enriched remote discovery is not a frozen standard workflow;
- `database.mongo.management` is optional and does not replace application service design;
- the 6.7.0 registry does not create Knex migrations, SQL tables, or distributed transactions across connections;
- MikroORM entities and Unit of Work support remain reserved for a later release.

## Method limits

- manual service creation remains possible, but it is not the recommended starting path;
- some `init` commands patch `nuxt.config.ts` most reliably when the file keeps a conventional structure;
- advanced authentication scenarios still require end-to-end validation;
- advanced CLI commands must be revalidated after changes to templates or TypeScript generation;
- SQL drivers are optional consumer dependencies and must be installed for the selected database.

## Documentation limits

- the public documentation intentionally focuses on the standard core;
- capabilities still being stabilized must stay outside quick-start paths;
- a capability not documented in VitePress must not be presented as a contractual OSS core feature.

## Stability rule

A capability must not be presented as a core pillar until it has:

- a clear CLI workflow;
- a reproducible example;
- tested behavior;
- aligned documentation;
- and stable Bun CLI parsing.

<!-- release-version: 6.7.37 -->
