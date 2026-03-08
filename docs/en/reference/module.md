---
editLink: false
---
# Module architecture

Main file: `src/module.ts`

## Responsibilities

The Nuxt module is responsible for:

- resolving the `feathers` options
- normalizing runtime configuration
- detecting `embedded` versus `remote` mode
- generating `.nuxt/feathers/**`
- wiring client and server plugins
- auto-installing `@pinia/nuxt` when `feathers.client.pinia` is enabled

## Internal structure

```txt
src/
├─ module.ts
├─ cli/
├─ runtime/
│  ├─ options/
│  ├─ templates/
│  ├─ services.ts
│  └─ utils/
└─ types/
```

## Execution flow

1. read `nuxt.config.ts`
2. run `resolveOptions()`
3. scan local services in embedded mode
4. generate `.nuxt/feathers/**`
5. let Nuxt load the generated runtime
