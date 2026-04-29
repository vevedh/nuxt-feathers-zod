import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getProjectRootFromNuxt } from './nfzPaths'
import { getNfzConsoleConfig } from './nfzConsoleContext'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : []
}

export function getNfzApiContext(event: any) {
  const nuxt = event.context?.nuxt
  const rc = useRuntimeConfig() as any
  const runtimeFeathers = rc?._feathers || rc?.public?._feathers || {}
  const optionFeathers = nuxt?.options?.feathers || {}

  const runtimeConsole = runtimeFeathers?.console || {}
  const optionConsole = optionFeathers?.console || {}

  const runtimeConsoleDirs = asStringArray(runtimeConsole?.servicesDirs)
  const optionConsoleDirs = asStringArray(optionConsole?.servicesDirs)
  const runtimeServicesDirs = asStringArray(runtimeFeathers?.servicesDirs)
  const optionServicesDirs = asStringArray(optionFeathers?.servicesDirs)

  const servicesDirs = runtimeConsoleDirs.length
    ? runtimeConsoleDirs
    : optionConsoleDirs.length
      ? optionConsoleDirs
      : runtimeServicesDirs.length
        ? runtimeServicesDirs
        : optionServicesDirs.length
          ? optionServicesDirs
          : ['services']

  const consoleConfig = getNfzConsoleConfig(nuxt)
  const projectRoot = getProjectRootFromNuxt(nuxt?.options?.rootDir)

  return {
    nuxt,
    runtimeConfig: rc,
    runtimeFeathers,
    optionFeathers,
    projectRoot,
    servicesDirs,
    console: {
      ...runtimeConsole,
      ...optionConsole,
      ...consoleConfig,
    },
  }
}

export function assertNfzConsoleWriteAllowed(event: any) {
  const ctx = getNfzApiContext(event)
  if (!ctx.console.allowWrite) {
    throw createError({ statusCode: 403, message: 'Schema console is read-only (allowWrite=false)' })
  }
  return ctx
}
