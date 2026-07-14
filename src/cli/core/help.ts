import consola from 'consola'

export function handleCliError(err: unknown) {
  const e = err as any
  const message = e?.message ? String(e.message) : String(err)

  // Common DX issue: trying to regenerate an existing artifact
  if (message.startsWith('File already exists:')) {
    consola.error(message)
    consola.info('Tip: re-run the command with --force to overwrite, or choose a different name.')
    process.exitCode = 1
    return
  }

  // Default: show a clean message (avoid full stack spam on Windows)
  if (e?.stack && typeof e.stack === 'string') {
    consola.error(message)
  }
  else {
    consola.error(message)
  }
  process.exitCode = 1
}

export function printHelp() {
  console.log(`
nuxt-feathers-zod CLI

Usage:
  bunx nuxt-feathers-zod <command> [args] [--flags]

Command groups:
  capabilities   Inspect the capabilities implemented by the installed version
  doctor         Diagnose the current Nuxt/Feathers project
  init           Initialize templates, embedded mode, remote mode, or a starter
  remote         Configure remote authentication helpers
  add            Generate services, middleware, server modules, or MongoDB Compose
  mongo          Configure MongoDB management services
  templates      Inspect or install template overrides
  plugins        Inspect or generate Feathers server plugins
  modules        Inspect or generate server modules
  middlewares    Inspect or generate middleware artifacts
  schema         Inspect, validate, or mutate a service schema manifest
  auth           Configure authentication hooks on existing services

Discover exact flags from the command tree:
  bunx nuxt-feathers-zod <command> --help
  bunx nuxt-feathers-zod capabilities --section all --json

Recommended workflow:
  bunx nuxt-feathers-zod init embedded --auth
  bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
  bunx nuxt-feathers-zod schema messages --add-field text:string!
  bunx nuxt-feathers-zod doctor

The technical CLI reference is generated from this command tree.
`)
}
