# nuxt-feathers-zod

[Documentation](https://vevedh.github.io/nuxt-feathers-zod/)

`nuxt-feathers-zod` is a Nuxt 4 module that integrates **FeathersJS v5 (Dove)** with a **CLI-first** workflow and a Zod-oriented service generation approach.

It supports two main usage patterns:

- **embedded mode**: a Feathers server runs inside Nuxt/Nitro
- **remote mode**: a Nuxt app uses a Feathers client against an external API

## What is already in the open source core

- Nuxt 4 + Nitro integration
- embedded and remote modes
- REST and Socket.IO transports
- embedded server with **Express** or **Koa**
- CLI bootstrap for `init embedded`, `init remote`, `init templates`
- CLI service generation with `add service`
- adapter-less service generation with `add service --custom`
- remote-service registration with `add remote-service`
- local/JWT auth flows
- Keycloak SSO bridge
- optional legacy Swagger support
- template overrides
- embedded server modules
- client-side helpers with Pinia / feathers-pinia support

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Optional Swagger dependencies:

```bash
bun add feathers-swagger swagger-ui-dist
```

## Recommended quick start — new Nuxt 4 app in embedded mode

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Embedded mode with local auth

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id --docs
bun dev
```

## Remote mode quick start

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Canonical CLI commands

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bunx nuxt-feathers-zod doctor
```

## Open source core boundary

The project is being stabilized around a predictable **standard open source core**.

That core currently includes:

- runtime + transports
- auth basics
- CLI generation
- template overrides
- server modules
- docs and playground validation

Potential future **license-key / Pro** candidates are intentionally kept outside that frozen core, such as advanced visual consoles, premium diagnostics, builders, enterprise presets, and packaged RBAC/policy layers.

## Development commands

```bash
bun install
bun run build
bun run typecheck
bun run docs:dev
bun run docs:build
```

## Publishing to npm

```bash
npm login
bun install
bun run build
npm pack --dry-run
npm version patch
npm publish --access public
```

For a beta release:

```bash
npm version prerelease --preid beta
npm publish --tag beta --access public
```

## Notes

- The recommended convention is `servicesDirs: ['services']`.
- The recommended path is **CLI-first**.
- Historical aliases may remain supported for backward compatibility, but the public docs only foreground the canonical forms.

## License

MIT
