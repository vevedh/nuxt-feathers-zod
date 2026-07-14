import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import packageJson from '../package.json'
import { createCliCommand } from '../src/cli/index'
import { NFZ_AUTH_EVENT_TYPES, NFZ_MODULE_CAPABILITIES } from '../src/runtime/capabilities'
import { collectCliCommandReference, renderCliReference } from './lib/cli-reference'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const problems: string[] = []

async function text(relativePath: string): Promise<string> {
  return readFile(resolve(root, relativePath), 'utf8')
}

function expectContains(content: string, expected: string, label: string): void {
  if (!content.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function collectInterfaceKeys(source: string, interfaceName: string): string[] {
  const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const keys: string[] = []
  sourceFile.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== interfaceName)
      return
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.name)
        continue
      if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
        keys.push(member.name.text)
    }
  })
  return keys
}

function collectExportedComposableFunctions(source: string): string[] {
  const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const names: string[] = []
  sourceFile.forEachChild((node) => {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
    const exported = modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    if (!exported)
      return
    if (ts.isFunctionDeclaration(node) && node.name?.text)
      names.push(node.name.text)
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          names.push(declaration.name.text)
      }
    }
  })
  return names
}

const cliRoot = createCliCommand()
const commands = collectCliCommandReference(cliRoot)
const cliHelp = await text('src/cli/core/help.ts')
for (const commandName of Object.keys(cliRoot.subCommands ?? {}))
  expectContains(cliHelp, commandName, 'CLI root help')
const cliFr = await text('docs/reference/cli.md')
const cliEn = await text('docs/en/reference/cli.md')
const generatedFr = renderCliReference(commands, 'fr', String(packageJson.version))
const generatedEn = renderCliReference(commands, 'en', String(packageJson.version))
if (cliFr !== generatedFr)
  problems.push('docs/reference/cli.md is not synchronized with the actual CLI command tree')
if (cliEn !== generatedEn)
  problems.push('docs/en/reference/cli.md is not synchronized with the actual CLI command tree')

const optionsSource = await text('src/runtime/options/index.ts')
const optionKeys = collectInterfaceKeys(optionsSource, 'ModuleOptions')
const configurationFr = await text('docs/reference/configuration.md')
const configurationEn = await text('docs/en/reference/configuration.md')
for (const key of optionKeys) {
  expectContains(configurationFr, `\`${key}\``, 'French configuration reference')
  expectContains(configurationEn, `\`${key}\``, 'English configuration reference')
}

const composablesDir = resolve(root, 'src/runtime/composables')
const composableFiles = (await readdir(composablesDir)).filter(name => name.endsWith('.ts'))
const actualComposableFunctions = new Set<string>()
for (const file of composableFiles) {
  for (const name of collectExportedComposableFunctions(await readFile(resolve(composablesDir, file), 'utf8')))
    actualComposableFunctions.add(name)
}
const runtimeFr = await text('docs/reference/runtime.md')
const runtimeEn = await text('docs/en/reference/runtime.md')
for (const name of [...actualComposableFunctions].sort()) {
  expectContains(runtimeFr, `\`${name}`, 'French runtime reference')
  expectContains(runtimeEn, `\`${name}`, 'English runtime reference')
}
for (const name of NFZ_MODULE_CAPABILITIES.composables) {
  if (!actualComposableFunctions.has(name))
    problems.push(`Capability matrix exposes missing composable ${name}`)
}

const servicesFr = await text('docs/reference/services.md')
const servicesEn = await text('docs/en/reference/services.md')
for (const service of NFZ_MODULE_CAPABILITIES.consoleServices) {
  expectContains(servicesFr, `\`${service.path}\``, 'French service reference')
  expectContains(servicesEn, `\`${service.path}\``, 'English service reference')
}

const eventsFr = await text('docs/reference/events.md')
const eventsEn = await text('docs/en/reference/events.md')
for (const event of NFZ_AUTH_EVENT_TYPES) {
  expectContains(eventsFr, `\`${event}\``, 'French event reference')
  expectContains(eventsEn, `\`${event}\``, 'English event reference')
}

const navigation = await text('playground/app/composables/usePlaygroundNavigation.ts')
const routes = Array.from(navigation.matchAll(/\bto:\s*'([^']+)'/g), match => match[1])
const playgroundFr = await text('docs/guide/playground.md')
const playgroundEn = await text('docs/en/guide/playground.md')
for (const route of routes) {
  expectContains(playgroundFr, `\`${route}\``, 'French playground guide')
  expectContains(playgroundEn, `\`${route}\``, 'English playground guide')
}

for (const relativePath of [
  'playground/app/pages/console/builder.vue',
  'playground/app/pages/console/rbac.vue',
]) {
  const source = await text(relativePath)
  if (source.includes('/api/nfz'))
    problems.push(`${relativePath} must consume Feathers nfz/* services, not legacy Nitro facades`)
  expectContains(source, 'useBuilderClient()', relativePath)
}

const runtimeConsolePages = resolve(root, 'src/runtime/console/pages')
try {
  const files = await readdir(runtimeConsolePages)
  if (files.some(file => file.endsWith('.vue')))
    problems.push(`src/runtime/console/pages still contains unpublished legacy UI pages: ${files.join(', ')}`)
}
catch {
  // Expected: the dead legacy page source has been removed.
}

const packageExports = packageJson.exports as Record<string, unknown>
if (!packageExports['./capabilities'])
  problems.push('package.json must export ./capabilities')

const capabilitiesSource = await text('src/runtime/capabilities.ts')
for (const service of NFZ_MODULE_CAPABILITIES.consoleServices)
  expectContains(capabilitiesSource, service.path.split('/')[1] || service.path, 'Capability source')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Project coherence check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Project coherence OK: ${commands.length} CLI commands, ${optionKeys.length} module options, ${actualComposableFunctions.size} composable functions, ${routes.length} playground routes.`)
