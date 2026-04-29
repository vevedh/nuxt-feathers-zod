import { createError, defineEventHandler, readBody } from 'h3'
import { assertNfzConsoleWriteAllowed, getNfzApiContext } from '../../utils/nfzApiContext'
import { applySchemaFields, getServiceInfo, writeManifestFields } from '../../utils/nfzSchema'

interface Body {
  service?: string
  fields?: Record<string, any>
  dryRun?: boolean
  sync?: 'manifest-to-schema' | 'schema-to-manifest'
}

function previewSync(info: any, mode: NonNullable<Body['sync']>) {
  if (mode === 'manifest-to-schema') {
    if (!info.manifestFields) {
      throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
    }

    return {
      mode,
      before: info,
      after: {
        ...info,
        fields: info.manifestFields,
        schemaFields: info.manifestFields,
        drift: false,
        driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] },
      },
    }
  }

  return {
    mode,
    before: info,
    after: {
      ...info,
      fields: info.schemaFields,
      manifestFields: info.schemaFields,
      drift: false,
      driftDetail: { onlyInManifest: [], onlyInSchema: [], changed: [] },
    },
  }
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event))
  const service = String(body?.service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing body field: service' })

  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  const info = getServiceInfo(projectRoot, servicesDirs, service)

  if (body.sync) {
    if (body.dryRun)
      return previewSync(info, body.sync)

    assertNfzConsoleWriteAllowed(event)

    if (body.sync === 'manifest-to-schema') {
      if (!info.manifestFields) {
        throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
      }
      applySchemaFields(info.schemaFile, info.manifestFields, info.idField)
      return getServiceInfo(projectRoot, servicesDirs, service)
    }

    writeManifestFields(projectRoot, servicesDirs, info.service, info.schemaFields)
    return getServiceInfo(projectRoot, servicesDirs, service)
  }

  if (!body?.fields || typeof body.fields !== 'object')
    throw createError({ statusCode: 400, message: 'Body.fields is required (or use Body.sync)' })

  if (body.dryRun) {
    return {
      before: info,
      after: { ...info, fields: body.fields },
    }
  }

  assertNfzConsoleWriteAllowed(event)

  writeManifestFields(projectRoot, servicesDirs, info.service, body.fields)
  applySchemaFields(info.schemaFile, body.fields, info.idField)

  return getServiceInfo(projectRoot, servicesDirs, service)
})
