# Builder Studio

The **Builder Studio** is the most important demonstration surface for explaining NFZ.

## What it should show

- official presets that are instantly understandable
- faithful preview of the `services/` structure
- a simple path from manifest to generated code
- a readable apply flow into an NFZ-native layout
- an **approximate CLI command** to explain UI/CLI parity

## Official presets

### `mongoCrud`
Standard MongoDB CRUD preset for showing the default NFZ pattern quickly.

Starter fields: `title`, `status`, `publishedAt`.

### `mongoSecureCrud`
Same base as `mongoCrud`, but aimed at auth/policies.

Starter fields: `title`, `ownerId`, `visibility`.

### `memoryCrud`
Demo preset with no Mongo dependency.

Starter fields: `label`, `enabled`.

### `action`
Preset for non-CRUD business services and custom methods.

Starter fields: `command`, `payload`, `dryRun`.

## Recommended demo flow

1. open `/builder-demo`
2. choose a preset
3. switch to `/services-manager?preset=...`
4. show `shared`, `class`, `schema`, `hooks`, `service`
5. compare the **approximate CLI command**
6. run `dry-run`
7. run `apply`
8. finish with `/auth-demo` for `mongoSecureCrud`

## Product goal

Builder Studio should make it obvious that NFZ is not only a Nuxt connector, but a **backend builder** for Nuxt + Feathers.


## What changed in 6.4.62

- business starters are now shown above generic presets
- optional generation of a separate `*.hooks.ts` file
- clearer parity between builder preview and the NFZ CLI layout


## Builder Studio 6.4.63

- optional barrels: `index.ts` in the service directory, and optionally `services/index.ts`
- the `users` starter was aligned more closely with NFZ local-auth conventions (`passwordHash`, password masking in the external resolver)
- builder apply was aligned more closely with a CLI-first demonstration layout


## 6.4.64

- Builder Studio: `services/index.ts` can now be aggregated from multiple services marked `service+root`.
- Preview and apply use the full manifest list to produce a coherent root barrel across multiple services.


## 6.4.65
The **Services Manager** flow now separates **Builder demo** services, **scanned services** and **free drafts** more clearly so that quick tests are easier to understand inside the demo app.


### 6.4.69

The builder now exposes three guided entry cards so you can quickly choose between quick tests, real service inspection and the advanced builder.

## 6.4.71 — License Center
- documentation for the License Center and reusable licensing / feature-gating components for future premium NFZ options
