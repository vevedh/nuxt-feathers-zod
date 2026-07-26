import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('generated client plugin configuration', () => {
  it('keeps generated service and plugin arrays mutable', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/runtime/templates/client/plugin.ts'), 'utf8')

    expect(source).toContain('const nfzClientPluginConfig = {')
    expect(source).toContain('export default defineNfzClientPlugin(nfzClientPluginConfig)')
    expect(source).not.toContain('} as const\n\nexport default defineNfzClientPlugin(nfzClientPluginConfig)')
  })
})
