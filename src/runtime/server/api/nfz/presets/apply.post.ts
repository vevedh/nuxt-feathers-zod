import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { applyPlan, assertPresetId, computePlan } from '../../../../../core/presets'
import { getNfzConsoleConfig, getNfzRootDir } from '../../../utils/nfzConsoleContext'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const presetRaw = String(body?.preset || '')
  const params = body?.params || {}

  const nuxt = event.context?.nuxt
  const { allowWrite } = getNfzConsoleConfig(nuxt)

  if (!allowWrite) {
    setResponseStatus(event, 403)
    return { ok: false, message: 'Console write is disabled (feathers.console.allowWrite=false)' }
  }

  if (!presetRaw) {
    setResponseStatus(event, 400)
    return { ok: false, message: 'Missing preset' }
  }

  try {
    const preset = assertPresetId(presetRaw)
    const plan = computePlan(preset, params)

    const res = await applyPlan(plan, { rootDir: getNfzRootDir(nuxt), allowWrite })
    const { ok: _ok, ...payload } = res as Record<string, unknown>
    return { ...payload, ok: true, preset }
  }
  catch (e: any) {
    const status = Number(e?.statusCode || 500)
    setResponseStatus(event, status)
    return { ok: false, message: e?.message || 'Apply failed', stdout: e?.stdout, stderr: e?.stderr }
  }
})
