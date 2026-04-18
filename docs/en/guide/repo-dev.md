# Repository development flow

Use this flow when working **inside the `nuxt-feathers-zod` repository itself**.

## Safe cleanup and install

```bash
bun run clean:repo
bun install
```

Avoid starting with `bunx nuxi cleanup` in the module repository. Before dependencies are installed, `nuxi` can fail because `@nuxt/kit` is not available yet.

## Post-install checks

```bash
bun run repo:doctor
bun run cli:build
bun run module:build
```

## CLI dist metadata

The module build step can still print a warning about `dist/cli/index.mjs`. This happens before the dedicated CLI build writes `dist/cli/package.json`. The supported contract is the final sequence:

```bash
bun run cli:build
bun run sanity:cli-dist-meta
```

If `sanity:cli-dist-meta` passes, the final CLI artifact is in the expected state.
