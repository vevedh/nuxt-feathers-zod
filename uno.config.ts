// UnoCSS config for nuxt-feathers-zod playground/dev (PATCH63)
// This file silences @unocss/config "Config file not found" and provides safe defaults.
// The module's devtools/console UI kit can extend this via presets/shortcuts as needed.
import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
