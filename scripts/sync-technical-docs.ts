import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCliCommand } from '../src/cli/index'
import packageJson from '../package.json'
import { collectCliCommandReference, renderCliReference } from './lib/cli-reference'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const commands = collectCliCommandReference(createCliCommand())
const version = String(packageJson.version)

await Promise.all([
  writeFile(resolve(root, 'docs/reference/cli.md'), renderCliReference(commands, 'fr', version), 'utf8'),
  writeFile(resolve(root, 'docs/en/reference/cli.md'), renderCliReference(commands, 'en', version), 'utf8'),
  writeFile(resolve(root, 'docs/guide/cli.md'), renderCliReference(commands, 'fr', version), 'utf8'),
  writeFile(resolve(root, 'docs/en/guide/cli.md'), renderCliReference(commands, 'en', version), 'utf8'),
])

console.log(`[nuxt-feathers-zod] Technical CLI documentation synchronized (${commands.length} leaf commands).`)
