import { defineEventHandler, readBody } from 'h3'
import { readRbacFile, writeRbacFile } from '../../rbac/rbacFile'
import { assertNfzConsoleWriteAllowed } from '../../utils/nfzApiContext'

export default defineEventHandler(async (event) => {
  const { projectRoot, servicesDirs } = assertNfzConsoleWriteAllowed(event)
  const current = readRbacFile(projectRoot, servicesDirs)
  const body = await readBody(event)

  const next = {
    ...current,
    ...(body && typeof body === 'object' ? body : {}),
    policies: (body?.policies && typeof body.policies === 'object') ? body.policies : current.policies,
  }

  const out = writeRbacFile(projectRoot, servicesDirs, next as any)
  const { ok: _ok, ...payload } = out as Record<string, unknown>

  return {
    ...payload,
    ok: true,
    projectRoot,
    servicesDirs,
  }
})
