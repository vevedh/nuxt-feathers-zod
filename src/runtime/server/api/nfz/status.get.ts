import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { useRuntimeConfig } from '#imports'
import { readRbacFile } from '../../rbac/rbacFile'
import { getNfzConsoleConfig } from '../../utils/nfzConsoleContext'
import { getProjectRootFromNuxt } from '../../utils/nfzPaths'

type StatusState =
  | 'empty'
  | 'needs-users'
  | 'ready'
  | 'unknown'

function absDir(rootDir: string, p: string) {
  return isAbsolute(p) ? p : resolve(rootDir, p)
}

export default defineEventHandler(async (event) => {
  const nuxt = event.context?.nuxt
  const nuxtRoot = nuxt?.options?.rootDir || process.cwd()
  const projectRoot = getProjectRootFromNuxt(nuxtRoot)
  const feathers = nuxt?.options?.feathers || {}
  const rc: any = useRuntimeConfig()
  const rcFeathers = rc?.feathers || rc?.public?.feathers || {}

  const servicesDirs = (rcFeathers.servicesDirs && rcFeathers.servicesDirs.length)
    ? rcFeathers.servicesDirs
    : ((feathers.servicesDirs && feathers.servicesDirs.length) ? feathers.servicesDirs : ['services'])

  const servicesDirsAbs = servicesDirs.map((d: string) => absDir(projectRoot, d))

  const usersSchemaPaths = servicesDirsAbs.flatMap(d => ([
    join(d, 'users', 'users.schema.ts'),
    join(d, 'users', 'users.schema.js'),
    join(d, 'users', 'users.schema.mts'),
  ]))

  const usersServicePaths = servicesDirsAbs.flatMap(d => ([
    join(d, 'users', 'users.ts'),
    join(d, 'users', 'users.js'),
    join(d, 'users', 'users.mts'),
  ]))

  const hasUsersSchema = usersSchemaPaths.some(p => existsSync(p))
  const hasUsersService = usersServicePaths.some(p => existsSync(p))
  const hasUsers = hasUsersSchema || hasUsersService

  const keycloakEnabled = !!feathers.keycloak
  const authEnabled = feathers.auth !== false || keycloakEnabled
  const authProvider = keycloakEnabled ? 'keycloak' : (authEnabled ? 'local' : null)

  let state: StatusState = 'unknown'
  if (!hasUsers && authEnabled && !keycloakEnabled)
    state = 'needs-users'
  else if (!hasUsers && !authEnabled)
    state = 'empty'
  else if (hasUsers || keycloakEnabled)
    state = 'ready'

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
    consoleEnabled: getNfzConsoleConfig(nuxt).enabled,
    allowWrite: getNfzConsoleConfig(nuxt).allowWrite,
    hasUsers,
    rbac,
    hints: {
      generateUsersCmd: 'bunx nuxt-feathers-zod add service users --auth',
      servicesDirsConfig: 'feathers: { servicesDirs: [\'services\'] }',
      rbacFile: 'services/.nfz/rbac.json (par défaut, dans le 1er servicesDir)',
      restartHint: 'Après génération de fichiers, redémarre le dev server (Ctrl+C puis bun dev) et supprime .nuxt si besoin.',
    },
  }
})
