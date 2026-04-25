import { readRbacFile } from '../../rbac/rbacFile'
import { getProjectRootFromNuxt } from '../../utils/nfzPaths'

export default defineEventHandler(async (event) => {
  const nuxt = event.context?.nuxt
  const projectRoot = getProjectRootFromNuxt(nuxt?.options?.rootDir)
  const feathers = nuxt?.options?.feathers || {}
  const servicesDirs = feathers.servicesDirs as string[] | undefined

  const file = readRbacFile(projectRoot, servicesDirs)

  return {
    ok: true,
    file,
  }
})
