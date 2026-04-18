---
editLink: false
---
# GitHub Pages (VitePress)

For this repository, the documentation site is built with **VitePress**, not Jekyll.

## Required GitHub Pages setting

In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.

This repository already provides a workflow:

- `.github/workflows/docs.yml`

That workflow:

1. installs dependencies with Bun
2. runs `bun run docs:build`
3. uploads `docs/.vitepress/dist`
4. deploys it with `actions/deploy-pages`

## Why this matters

If GitHub Pages is configured to publish directly from the `docs/` folder on a branch, GitHub will try to run **Jekyll** on the Markdown sources. That can fail on VitePress sources and front matter.

GitHub recommends using a custom GitHub Actions workflow when you use a static site generator other than Jekyll.

## Local commands

```bash
bun install
bun run docs:build
```

## If you must publish from a branch source

That is not the recommended mode for this repository. If you still use a branch/folder publishing source, you must disable the Jekyll build process with a `.nojekyll` file in the published output.


## CI safety checks

Before the VitePress build, run:

```bash
bun run docs:check-frontmatter
```

This catches invalid YAML front matter early, for example:

```md
---
editLink:false
---
```

The valid form is:

```md
---
editLink: false
---
```
