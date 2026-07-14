import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'

import { detectResolvedMode, isResolvedServerEnabled } from '../runtime/options/mode'

export function applyMcpLayer(nuxt: Nuxt, options: ResolvedOptions): void {
  const mode = detectResolvedMode(options)
  const serverEnabled = isResolvedServerEnabled(options)

  nuxt.hook('mcp:setup' as any, ({ mcp }: any) => {
    mcp.tool('get-feathers-config', 'Get the Feathers config', {}, async () => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ mode, serverEnabled, ...options }, null, 2),
        }],
      }
    })
  })
}
