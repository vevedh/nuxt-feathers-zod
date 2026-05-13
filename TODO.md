# TODO

This file is intentionally kept short and operational. Historical notes and AI session context now live in:

- `JOURNAL.md`
- `PATCHLOG.md`
- `PROMPT_CONTEXT.md`
- `AI_CONTEXT/PROJECT_CONTEXT.md`
- `NFZ_BACKLOG_6.4.109-6.4.114.md`

## Current maintenance focus

- finish Phase 3 runtime parity for internal tools
- keep CLI scaffolds reproducible and test-covered
- keep FR/EN docs aligned and free of mixed-language fragments
- keep release/build scripts deterministic on Bun + Windows

## Repository hygiene rules

- do not commit local `.tgz` release artifacts at the repo root
- do not keep scratch files like `tmpfile` or `out.js` in the root
- use `bun run clean:repo` instead of `bunx nuxi cleanup` in the module repo
- write new patch history in `PATCHLOG.md` and `JOURNAL.md`
