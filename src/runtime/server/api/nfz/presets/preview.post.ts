import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { assertPresetId, computePlan } from '../../../../../core/presets'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as any
  const presetRaw = String(body?.preset || '')
  const params = body?.params || {}

  if (!presetRaw) {
    setResponseStatus(event, 400)
    return { ok: false, message: 'Missing preset' }
  }

  try {
    const preset = assertPresetId(presetRaw)
    const plan = computePlan(preset, params)
    const { ok: _ok, ...payload } = plan as Record<string, unknown>
    return { ...payload, ok: true }
  } catch (e: any) {
    setResponseStatus(event, 400)
    return { ok: false, message: e?.message || 'Invalid preset' }
  }
})
