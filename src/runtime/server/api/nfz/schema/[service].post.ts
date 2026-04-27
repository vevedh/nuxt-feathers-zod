import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { applySchemaFields, findProjectRoot, getServiceInfo, writeManifestFields } from '../../../utils/nfzSchema'

interface Body {
  fields?: Record<string, any>
  dryRun?: boolean
  /** Synchronize sources without manually editing fields */
  sync?: 'manifest-to-schema' | 'schema-to-manifest'
}

export default defineEventHandler(async (event) => {
  const service = getRouterParam(event, 'service')
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing :service param' })

  const body = (await readBody(event))

  const rc = useRuntimeConfig()
  const consoleCfg = rc?._feathers?.console
  const feathersDirs: string[] = rc?._feathers?.servicesDirs ?? []
  const consoleDirs: string[] = consoleCfg?.servicesDirs ?? []
  const servicesDirs: string[] = (consoleDirs.length ? consoleDirs : (feathersDirs.length ? feathersDirs : ['services']))
  const allowWrite: boolean = consoleCfg?.allowWrite ?? false

  const projectRoot = findProjectRoot(process.cwd())
  const info = getServiceInfo(projectRoot, servicesDirs, service)

  // --- Sync modes (no fields needed) ---
  if (body.sync) {
    if (body.dryRun) {
      if (body.sync === 'manifest-to-schema') {
        if (!info.manifestFields) {
          throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
        }
        return {
          mode: body.sync,
          before: info,
          after: { ...info, fields: info.manifestFields, schemaFields: info.manifestFields, drift: false, driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] } },
        }
      }
      // schema-to-manifest
      return {
        mode: body.sync,
        before: info,
        after: { ...info, fields: info.schemaFields, manifestFields: info.schemaFields, drift: false, driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] } },
      }
    }

    if (!allowWrite) {
      throw createError({ statusCode: 403, message: 'Schema console is read-only (allowWrite=false)' })
    }

    if (body.sync === 'manifest-to-schema') {
      if (!info.manifestFields) {
        throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
      }
      applySchemaFields(info.schemaFile, info.manifestFields, info.idField)
      return getServiceInfo(projectRoot, servicesDirs, service)
    }

    // schema-to-manifest
    writeManifestFields(projectRoot, servicesDirs, info.service, info.schemaFields)
    return getServiceInfo(projectRoot, servicesDirs, service)
  }

  // --- Manual field edit mode ---
  if (!body?.fields || typeof body.fields !== 'object')
    throw createError({ statusCode: 400, message: 'Body.fields is required (or use Body.sync)' })

  if (body.dryRun) {
    return {
      before: info,
      after: { ...info, fields: body.fields },
    }
  }

  if (!allowWrite) {
    throw createError({ statusCode: 403, message: 'Schema console is read-only (allowWrite=false)' })
  }

  // Persist
  writeManifestFields(projectRoot, servicesDirs, info.service, body.fields)
  applySchemaFields(info.schemaFile, body.fields, info.idField)

  // Return updated
  return getServiceInfo(projectRoot, servicesDirs, service)
})
