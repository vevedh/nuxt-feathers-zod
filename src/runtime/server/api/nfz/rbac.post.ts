import { readBody } from 'h3'
import { readRbacFile, writeRbacFile } from '../../rbac/rbacFile'
import { getProjectRootFromNuxt } from '../../utils/nfzPaths'

function assertWriteAllowed(event: any) {
  const nuxt = event.context?.nuxt
  const feathers = nuxt?.options?.feathers || {}
  if (!feathers.console?.enabled) {
    const err: any = new Error('Console disabled')
    err.statusCode = 403
    throw err
  }
  if (!feathers.console?.allowWrite) {
    const err: any = new Error('Write locked (console.allowWrite=false)')
    err.statusCode = 423
    throw err
  }
}

export default defineEventHandler(async (event) => {
  assertWriteAllowed(event)

  const nuxt = event.context?.nuxt
  const projectRoot = getProjectRootFromNuxt(nuxt?.options?.rootDir)
  const feathers = nuxt?.options?.feathers || {}
  const servicesDirs = feathers.servicesDirs as string[] | undefined

  const current = readRbacFile(projectRoot, servicesDirs)
  const body = await readBody(event)

  const next = {
    ...current,
    ...(body && typeof body === 'object' ? body : {}),
    policies: (body?.policies && typeof body.policies === 'object') ? body.policies : current.policies,
  }

  const out = writeRbacFile(projectRoot, servicesDirs, next)

  return { ok: true, ...out }
})
