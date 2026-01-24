import type { Resolver } from '@nuxt/kit'
import type { ResolvedOptions } from '../../options'
import type { Templates } from '../types'
import { getClientAuthContents } from './authentication'
import { getClientContents } from './client'
import { getClientConnectionContents } from './connection'
import { getClientPluginContents } from './plugin'

export function getClientTemplates(options: ResolvedOptions, resolver: Resolver): Templates {
  const clientTemplates: Templates = [
    {
      filename: 'feathers/client/client.ts',
      getContents: getClientContents(options),
      write: true,
    },
    {
      filename: 'feathers/client/connection.ts',
      getContents: getClientConnectionContents(options, resolver),
      write: true,
    },
    {
      filename: 'feathers/client/plugin.ts',
      getContents: getClientPluginContents(options),
      write: true,
    },
  ]

  if (options.auth) {
    clientTemplates.push({
      filename: 'feathers/client/authentication.ts',
      getContents: getClientAuthContents(options),
      write: true,
    },
    )
  }

  return clientTemplates
}
