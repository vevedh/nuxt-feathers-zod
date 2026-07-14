# nuxt-feathers-zod 6.5.41

## Public repository cleanup

This maintenance release separates local maintenance material from the publishable project tree.

The repository now keeps source code, tests, examples, VitePress documentation and release material focused on the module itself. Local maintenance notes are excluded through `.gitignore` and can remain on a developer workstation without appearing in commits.

## Documentation

The editorial checks now focus on direct technical writing. They scan the maintained VitePress pages and project guides for meta phrasing that makes instructions harder to read.

The release procedure references `CHANGELOG.md`, `PATCHLOG.md` and the release notes as the public maintenance record.

## Repository validation

`bun run sanity:public-repository` rejects private maintenance paths and legacy handoff markers from the public source tree. The check runs during prepare, prepack and release validation.
