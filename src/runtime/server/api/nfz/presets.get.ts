import { listPresets } from '../../../../core/presets'

export default defineEventHandler(() => {
  return { presets: listPresets() }
})
