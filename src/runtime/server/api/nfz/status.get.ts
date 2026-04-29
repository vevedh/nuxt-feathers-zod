import { defineEventHandler } from 'h3'
import { existsSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { readRbacFile } from '../../rbac/rbacFile'
import { getNfzApiContext } from '../../utils/nfzApiContext'

type StatusState =
  | 'empty'
  | 'needs-users'
  | 'ready'
  | 'unknown'

function absDir(rootDir: string, p: string) {
  return isAbsolute(p) ? p : resolve(rootDir, p)
}

export default defineEventHandler(async (event) => {
  const ctx = getNfzApiContext(event)
  const nuxtRoot = ctx.nuxt?.options?.rootDir || process.cwd()
  const { projectRoot, servicesDirs, optionFeathers, runtimeFeathers } = ctx

  const servicesDirsAbs = servicesDirs.map((d: string) => absDir(projectRoot, d))

  const usersSchemaPaths = servicesDirsAbs.flatMap((d: string) => ([
    join(d, 'users', 'users.schema.ts'),
    join(d, 'users', 'users.schema.js'),
    join(d, 'users', 'users.schema.mts'),
  ]))

  const usersServicePaths = servicesDirsAbs.flatMap((d: string) => ([
    join(d, 'users', 'users.ts'),
    join(d, 'users', 'users.js'),
    join(d, 'users', 'users.mts'),
  ]))

  const hasUsersSchema = usersSchemaPaths.some((p: string) => existsSync(p))
  const hasUsersService = usersServicePaths.some((p: string) => existsSync(p))
  const hasUsers = hasUsersSchema || hasUsersService

  const keycloakEnabled = !!(optionFeathers.keycloak || runtimeFeathers.keycloak)
  const authOption = optionFeathers.auth ?? runtimeFeathers.auth
  const authEnabled = authOption !== false || keycloakEnabled
  const authProvider = keycloakEnabled ? 'keycloak' : (authEnabled ? 'local' : null)

  let state: StatusState = 'unknown'
  if (!hasUsers && authEnabled && !keycloakEnabled) state = 'needs-users'
  else if (!hasUsers && !authEnabled) state = 'empty'
  else if (hasUsers || keycloakEnabled) state = 'ready'

  const rbacFile = readRbacFile(projectRoot, servicesDirs)
  const rbac = {
    enabled: !!rbacFile.enabled,
    mode: authProvider === 'keycloak' ? 'keycloak' : 'local',
    ready: !!rbacFile.enabled,
    denyByDefault: !!rbacFile.denyByDefault,
    updatedAt: rbacFile.updatedAt || null,
  }

  return {
    ok: true,
    projectRoot,
    rootDir: nuxtRoot,
    state,
    servicesDirs,
    authEnabled,
    authProvider,
    consoleEnabled: ctx.console.enabled,
    allowWrite: ctx.console.allowWrite,
    hasUsers,
    rbac,
    hints: {
      generateUsersCmd: 'bunx nuxt-feathers-zod add service users --auth',
      servicesDirsConfig: "feathers: { servicesDirs: ['services'] }",
      rbacFile: 'services/.nfz/rbac.json (par défaut, dans le 1er servicesDir)',
      restartHint: 'Après génération de fichiers, redémarre le dev server (Ctrl+C puis bun dev) et supprime .nuxt si besoin.',
    },
  }
})
