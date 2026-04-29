import { createError, defineEventHandler, readBody } from 'h3'
import { assertPresetId, computePlan } from '../../../../core/presets'
import { getNfzApiContext } from '../../utils/nfzApiContext'
import { getServiceInfo } from '../../utils/nfzSchema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (body?.preset) {
    const preset = assertPresetId(String(body.preset))
    const plan = computePlan(preset, body?.params || {})
    const { ok: _ok, ...payload } = plan as unknown as Record<string, unknown>
    return { ...payload, ok: true, preset }
  }

  const service = String(body?.service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing body field: preset or service' })

  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  const info = getServiceInfo(projectRoot, servicesDirs, service)

  if (body?.sync === 'manifest-to-schema') {
    if (!info.manifestFields) {
      throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
    }
    return {
      ok: true,
      mode: body.sync,
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

  if (body?.sync === 'schema-to-manifest') {
    return {
      ok: true,
      mode: body.sync,
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

  if (!body?.fields || typeof body.fields !== 'object')
    throw createError({ statusCode: 400, message: 'Body.fields is required for service preview' })

  return {
    ok: true,
    before: info,
    after: { ...info, fields: body.fields },
  }
})
