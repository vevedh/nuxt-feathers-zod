# NFZ backlog 6.4.115 → 6.4.118

## 6.4.115 — doc / repo cleanup
- remove stale root artifacts (`*.tgz`, `out.js`, `tmpfile`, free-form notes)
- add `REPO_DEV.md`
- clean mixed-language fragments in `docs/en/*`
- tighten `.gitignore` for local release artifacts

## 6.4.116 — release/build hardening ✅ completed
- accepted final handling of the `dist/cli/index.mjs` warning: document it and verify the final CLI metadata after `cli:build`
- added `sanity:cli-dist-meta` to enforce the final `dist/cli/package.json` contract
- clarified repo-dev and Bun + Windows happy path in `REPO_DEV.md` and docs

## 6.4.117 — docs IA/UX pass
- unify quickstart wording across README / docs / FR / EN
- reduce duplicate content between README and docs

## 6.4.118 — dependency stabilization
- continue replacing critical `latest` ranges with pinned versions
- document update strategy
