import { createError, defineEventHandler, readBody } from 'h3'
import { assertPresetId, computePlan, applyPlan } from '../../../../core/presets'
import { applySchemaFields, getServiceInfo, writeManifestFields } from '../../utils/nfzSchema'
import { assertNfzConsoleWriteAllowed } from '../../utils/nfzApiContext'
import { getNfzRootDir } from '../../utils/nfzConsoleContext'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as any
  const ctx = assertNfzConsoleWriteAllowed(event)

  if (body?.preset) {
    const preset = assertPresetId(String(body.preset))
    const plan = computePlan(preset, body?.params || {})
    const res = await applyPlan(plan, { rootDir: getNfzRootDir(ctx.nuxt), allowWrite: ctx.console.allowWrite })
    const { ok: _ok, ...payload } = res as Record<string, unknown>
    return { ...payload, ok: true, preset }
  }

  const service = String(body?.service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing body field: preset or service' })

  const info = getServiceInfo(ctx.projectRoot, ctx.servicesDirs, service)

  if (body?.sync === 'manifest-to-schema') {
    if (!info.manifestFields) {
      throw createError({ statusCode: 400, message: 'No manifest fields to sync (manifest missing for this service)' })
    }
    applySchemaFields(info.schemaFile, info.manifestFields as any, info.idField)
    return { ok: true, ...getServiceInfo(ctx.projectRoot, ctx.servicesDirs, service) }
  }

  if (body?.sync === 'schema-to-manifest') {
    writeManifestFields(ctx.projectRoot, ctx.servicesDirs, info.service, info.schemaFields as any)
    return { ok: true, ...getServiceInfo(ctx.projectRoot, ctx.servicesDirs, service) }
  }

  if (!body?.fields || typeof body.fields !== 'object')
    throw createError({ statusCode: 400, message: 'Body.fields is required for service apply' })

  writeManifestFields(ctx.projectRoot, ctx.servicesDirs, info.service, body.fields as any)
  applySchemaFields(info.schemaFile, body.fields as any, info.idField)

  return { ok: true, ...getServiceInfo(ctx.projectRoot, ctx.servicesDirs, service) }
})
