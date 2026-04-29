import { defineEventHandler } from 'h3'
import { readRbacFile } from '../../rbac/rbacFile'
import { getNfzApiContext } from '../../utils/nfzApiContext'

export default defineEventHandler(async (event) => {
  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  const file = readRbacFile(projectRoot, servicesDirs)

  return {
    ok: true,
    projectRoot,
    servicesDirs,
    file,
  }
})
