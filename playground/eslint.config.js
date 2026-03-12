import antfu from '@gabortorma/antfu-eslint-config'

let withNuxt = config => config

try {
  const mod = await import('./.nuxt/eslint.config.mjs')
  if (typeof mod.default === 'function')
    withNuxt = mod.default
}
catch {}

export default withNuxt(antfu())
