# CLI Reference — OSS 6.5.29

Entry command:

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Recommended public core

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

## Secondary commands / compatibility

- `add custom-service <name>`
- `init templates`
- `templates list`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`

## Canonical examples

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --diff
bunx nuxt-feathers-zod schema users --repair-auth
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
bunx nuxt-feathers-zod doctor
```

## Stability rules

- Default adapter = `memory`
- Default schema = `none`
- Recommended `servicesDirs` = `['services']`
- In remote mode, `transport: auto` resolves to `socketio`
- `doctor` reports Mongo management and warns when enabled without `database.mongo.url`
- Public docs should foreground canonical commands, not historical aliases
- `add middleware` public docs should foreground `nitro` and `route`; other targets remain advanced


## Advanced target semantics

- `plugin`: global server-side Feathers plugin via `plugins add <name>` -> `server/feathers/<name>.ts`
- `server-module`: server infrastructure module via `add server-module <name>` -> `server/feathers/modules/<name>.ts`
- `module`: alias target of `server-module` via `add middleware <name> --target module`
- `client-module`: browser-only Nuxt plugin via `add middleware <name> --target client-module` -> `app/plugins/<name>.client.ts`
- `hook`: reusable Feathers hook via `add middleware <name> --target hook` -> `server/feathers/hooks/<name>.ts`
- `policy`: authorization-focused hook via `add middleware <name> --target policy` -> `server/feathers/policies/<name>.ts`
