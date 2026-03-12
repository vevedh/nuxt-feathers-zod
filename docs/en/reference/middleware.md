---
editLink: false
---
# Middleware

The module can generate several middleware and server-module families.

## Nitro middleware

Target: `--target nitro`

Used for the Nuxt/Nitro layer itself.

Example:

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
```

## Feathers server plugin

Target: `--target feathers`

Used to generate a plugin under `server/feathers/*.ts`.

Example:

```bash
bunx nuxt-feathers-zod add middleware audit --target feathers
```

## Embedded server modules

Target: `--target server-module` or dedicated `add server-module` command.

Examples:

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
bunx nuxt-feathers-zod add server-module helmet --preset helmet
```

## Supported targets

- `nitro`
- `feathers`
- `server-module`
- `module`

## Important

Older docs sometimes mentioned `--target client`. That is **not** a supported target in the current OSS-core CLI.
