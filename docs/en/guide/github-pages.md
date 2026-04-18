# GitHub Pages

Use **GitHub Actions** as the Pages source for this repository.


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
