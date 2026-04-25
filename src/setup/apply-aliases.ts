import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'
import type { AliasEntry, AliasInput } from '../runtime/options/types'

import { createResolver } from '@nuxt/kit'
import defu from 'defu'

import { resolveRuntimePath } from './runtime-path'
import { dedupeStrings } from './utils'

function aliasKey(find: AliasEntry['find']): string {
  return typeof find === 'string' ? `str:${find}` : `re:${find.toString()}`
}

function normalizeViteAliases(input: AliasInput): AliasEntry[] {
  const list: AliasEntry[] = Array.isArray(input)
    ? input
    : Object.entries(input || {}).map(([find, replacement]) => ({ find, replacement }))

  const map = new Map<string, AliasEntry>()

  for (const entry of list) {
    if (!entry)
      continue
    map.set(`${aliasKey(entry.find)}=>${String(entry.replacement)}`, entry)
  }

  return Array.from(map.values())
}

export function applyAliases(options: ResolvedOptions, nuxt: Nuxt): void {
  const resolver = createResolver(import.meta.url)
  const runtime = (path: string): string => resolveRuntimePath(resolver, path)
  const aliases = {
    'nuxt-feathers-zod/server$': resolver.resolve(options.templateDir, 'server/server'),
    'nuxt-feathers-zod/validators$': runtime('zod/validators'),
    'nuxt-feathers-zod/query$': runtime('zod/query'),
    'nuxt-feathers-zod/zod$': runtime('zod/index'),
    'nuxt-feathers-zod/options$': runtime('options/index'),
    'nuxt-feathers-zod/auth-utils$': runtime('utils/auth'),
    'nuxt-feathers-zod/config-utils$': runtime('utils/config'),
    'nuxt-feathers-zod/auth-runtime$': runtime('composables/useAuthRuntime'),
    'nuxt-feathers-zod/auth-bound-fetch$': runtime('composables/useAuthBoundFetch'),
    'nuxt-feathers-zod/protected-tool$': runtime('composables/useProtectedTool'),
    'nuxt-feathers-zod/mongo-management-client$': runtime('composables/useMongoManagementClient'),
    'nuxt-feathers-zod/admin-client$': runtime('composables/useNfzAdminClient'),
    'nuxt-feathers-zod/builder-client$': runtime('composables/useBuilderClient'),
    'nuxt-feathers-zod/protected-page$': runtime('composables/useProtectedPage'),
    'nuxt-feathers-zod/auth-trace$': runtime('composables/useAuthTrace'),
    'nuxt-feathers-zod/client-runtime$': runtime('client/defineNfzClientPlugin'),
    'nuxt-feathers-zod/server-bootstrap$': runtime('server/bootstrap'),
    'nuxt-feathers-zod/server-app-utils$': runtime('server/app-utils'),
    'nuxt-feathers-zod/server-mongodb$': runtime('server/mongodb'),
    'nuxt-feathers-zod/server-keycloak$': runtime('server/keycloak'),
  }

  nuxt.options.alias = defu(nuxt.options.alias, aliases)
  if (options.client)
    nuxt.options.alias['nuxt-feathers-zod/client$'] = resolver.resolve(options.templateDir, 'client/client')

  nuxt.options.vite ||= {}
  nuxt.options.vite.resolve ||= {}
  const viteAliases = normalizeViteAliases(nuxt.options.vite.resolve.alias as AliasInput)

  for (const [find, replacement] of Object.entries(aliases))
    viteAliases.push({ find, replacement })

  if (options.keycloak) {
    viteAliases.push({
      find: /^js-sha256$/,
      replacement: runtime('shims/js-sha256-default'),
    })
  }

  nuxt.options.vite.resolve.alias = normalizeViteAliases(viteAliases)
  nuxt.options.vite.optimizeDeps ||= {}
  nuxt.options.vite.optimizeDeps.include = dedupeStrings([
    ...(nuxt.options.vite.optimizeDeps.include || []),
    ...(options.keycloak ? ['keycloak-js', 'js-sha256'] : []),
  ])

  nuxt.hook('nitro:config' as any, (nitroConfig: any) => {
    nitroConfig.alias = defu(nitroConfig.alias, aliases)
  })
}
