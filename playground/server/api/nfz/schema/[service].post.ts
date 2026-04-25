import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { findProjectRoot, getServiceInfo, writeManifestFields, applySchemaFields } from '../../../utils/nfzSchema'

type Body = {
  fields?: Record<string, any>
  dryRun?: boolean
}

export default defineEventHandler(async (event) => {
  const service = getRouterParam(event, 'service')
  if (!service) throw new Error('Missing :service param')

  const body = (await readBody(event)) as Body
  if (!body?.fields || typeof body.fields !== 'object') throw new Error('Body.fields is required')

  const projectRoot = findProjectRoot(process.cwd())
  const info = getServiceInfo(projectRoot, 'services', service)

  if (body.dryRun) {
    return {
      before: info,
      after: { ...info, fields: body.fields },
    }
  }

  // Persist
  writeManifestFields(projectRoot, info.service, body.fields as any)
  applySchemaFields(info.schemaFile, body.fields as any, info.idField)

  // Return updated
  return getServiceInfo(projectRoot, 'services', service)
})
