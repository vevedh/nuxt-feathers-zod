import { defineEventHandler } from 'h3'
import { listPresets } from '../../../../core/presets'

export default defineEventHandler(() => {
  return { presets: listPresets() }
})
