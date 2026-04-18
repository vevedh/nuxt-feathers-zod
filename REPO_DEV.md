# Repository development flow

## Recommended local flow

In the **module repository**, prefer this sequence:

```bash
bun run clean:repo
bun install
bun run repo:doctor
```

Then, depending on what you are validating:

```bash
bun run cli:build
bun run module:build
bun test
```

## Why not `bunx nuxi cleanup` first?

`bunx nuxi cleanup` can fail before dependencies are installed because `nuxi` expects `@nuxt/kit` to already exist in the current project. In the module repository, `bun run clean:repo` is the safe cleanup entry point.

## About the `dist/cli/index.mjs` warning during `module:build`

`nuxt-module-build build` may still print a warning similar to:

- `Potential missing package.json files: dist/cli/index.mjs`

This warning happens **during the module build step**, before the dedicated CLI build writes `dist/cli/package.json`. The supported final contract is:

1. `module:build` builds the module runtime
2. `cli:build` writes `dist/cli/index.mjs`
3. `cli:build` also writes `dist/cli/package.json`
4. `sanity:cli-dist-meta` verifies the final CLI metadata

Treat the warning as a build-time note, not as the final source of truth. The final source of truth is the post-build sanity check.

## Windows / Bun happy path

Recommended sequence on Windows as well:

```bash
bun run clean:repo
bun install
bun run sanity:file-service-template
bun run cli:build
```

If you need the full check:

```bash
bun run release:check
```
