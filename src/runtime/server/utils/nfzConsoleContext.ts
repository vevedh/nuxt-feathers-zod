import { useRuntimeConfig } from '#imports'

export function getNfzConsoleConfig(nuxt: any) {
  const rc: any = useRuntimeConfig()
  const fromRc = rc?.feathers?.console || rc?.public?.feathers?.console || {}
  const fromOpts = nuxt?.options?.feathers?.console || {}
  const enabled = (fromRc.enabled ?? fromOpts.enabled ?? false) === true
  const allowWrite = (fromRc.allowWrite ?? fromOpts.allowWrite ?? false) === true
  return { enabled, allowWrite }
}

export function getNfzRootDir(nuxt: any) {
  return nuxt?.options?.rootDir || process.cwd()
}
