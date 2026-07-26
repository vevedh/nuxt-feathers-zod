import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const docsRoot = resolve(root, 'docs')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const starterPackage = JSON.parse(readFileSync(resolve(root, 'examples/nfz-quasar-unocss-pinia-starter/package.json'), 'utf8'))
const rootScripts = new Set(Object.keys(packageJson.scripts || {}))
const starterScripts = new Set(Object.keys(starterPackage.scripts || {}))
const ignoredMarkdownDirectories = new Set([
  '.nuxt',
  '.output',
  '.vitepress',
  'dist',
  'node_modules',
])

function walkMarkdown(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (ignoredMarkdownDirectories.has(entry.name))
        continue
      files.push(...walkMarkdown(fullPath))
    }
    else if (entry.isFile() && entry.name.endsWith('.md'))
      files.push(fullPath)
  }
  return files
}

function shellSplit(command) {
  const tokens = []
  let current = ''
  let quote = null
  let escaped = false
  for (const char of command) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== "'") {
      escaped = true
      continue
    }
    if (quote) {
      if (char === quote)
        quote = null
      else
        current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current)
    tokens.push(current)
  return tokens
}

function extractCommands(file) {
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  const commands = []
  let inFence = false
  let language = ''
  let startLine = 0
  let buffer = []

  const flushFence = () => {
    if (!['bash', 'sh', 'shell', 'powershell', 'ps1', 'cmd', 'console'].includes(language))
      return
    let current = ''
    for (let index = 0; index < buffer.length; index += 1) {
      let line = buffer[index].trim()
      if (!line || line.startsWith('#'))
        continue
      line = line.replace(/^\$\s+/, '').replace(/^PS\s+[^>]+>\s*/, '')
      current = current ? `${current} ${line}` : line
      if (/[\\`]$/.test(current)) {
        current = current.slice(0, -1).trim()
        continue
      }
      commands.push({ command: current, line: startLine + index, source: 'fence' })
      current = ''
    }
    if (current)
      commands.push({ command: current, line: startLine + buffer.length - 1, source: 'fence' })
  }

  for (let index = 0; index < lines.length; index += 1) {
    const marker = lines[index].match(/^```([^\s]*)/)
    if (marker) {
      if (!inFence) {
        inFence = true
        language = marker[1].toLowerCase()
        startLine = index + 2
        buffer = []
      }
      else {
        flushFence()
        inFence = false
        language = ''
        buffer = []
      }
      continue
    }
    if (inFence) {
      buffer.push(lines[index])
      continue
    }
    for (const match of lines[index].matchAll(/`([^`]+)`/g)) {
      if (/^(?:bun(?:\s+(?:run|install|add|dev|upgrade|--version)\b)|bunx\s+\S+|npm\s+\S+|npx\s+\S+|pnpm\s+\S+|yarn\s+\S+|docker\s+\S+|git\s+\S+|curl(?:\.exe)?\s+\S+|node\s+\S+)/.test(match[1]))
        commands.push({ command: match[1], line: index + 1, source: 'inline' })
    }
  }
  return commands
}

function parseCliReference() {
  const reference = readFileSync(resolve(docsRoot, 'reference/cli.md'), 'utf8')
  const commands = new Map()
  for (const line of reference.split(/\r?\n/)) {
    const match = line.match(/^\| `([^`]+)` \|.*\| (.*) \|$/)
    if (!match)
      continue
    const flags = new Map()
    const requiredPositionals = []
    for (const cell of match[2].split('<br>')) {
      for (const tokenMatch of cell.matchAll(/`([^`]+)`/g)) {
        const token = tokenMatch[1]
        if (!token.startsWith('--')) {
          if (/^<[^>]+>$/.test(token))
            requiredPositionals.push(token.slice(1, -1))
          continue
        }
        const names = [...token.matchAll(/--([\w-]+)/g)].map(item => item[1])
        const valueMatch = token.match(/<([^>]+)>/)
        const options = valueMatch && valueMatch[1] !== 'value' ? valueMatch[1].split('|') : []
        const isBoolean = !valueMatch
        const required = /\*\s*$/.test(token)
        const flag = { isBoolean, options, required, token }
        for (const name of names) {
          flags.set(name, flag)
        }
      }
    }
    commands.set(match[1], { flags, requiredPositionals })
  }
  return commands
}

const cliReference = parseCliReference()
const problems = []
const stats = {
  markdownFiles: 0,
  commands: 0,
  cliCommands: 0,
  packageScripts: 0,
  externalCommands: 0,
}

function addProblem(file, line, message, command) {
  problems.push(`${relative(root, file).replaceAll('\\', '/')}:${line}: ${message}\n  ${command}`)
}

function validateCliCommand(file, entry) {
  const tokens = shellSplit(entry.command)
  const binaryIndex = tokens.findIndex((token, index) => {
    if (!/^nuxt-feathers-zod(?:@[^\s]+)?$/.test(token))
      return false
    return index === 0 || ['bunx', 'npx'].includes(tokens[index - 1]) || /(?:^|[\/])bin[\/](?:nfz|nuxt-feathers-zod)$/.test(tokens[index - 1] || '')
  })
  if (binaryIndex < 0)
    return false

  stats.cliCommands += 1
  const binary = tokens[binaryIndex]
  const pinnedVersion = binary.match(/@(.+)$/)?.[1]
  if (pinnedVersion && pinnedVersion !== packageJson.version)
    addProblem(file, entry.line, `version épinglée ${pinnedVersion} différente de package.json (${packageJson.version})`, entry.command)

  const rest = tokens.slice(binaryIndex + 1)
  if (rest[0] === '--help')
    return true

  let commandPath = ''
  for (const path of cliReference.keys()) {
    const segments = path.split(' ')
    if (segments.every((segment, index) => rest[index] === segment)
      && segments.length > commandPath.split(' ').filter(Boolean).length) {
      commandPath = path
    }
  }
  if (!commandPath) {
    addProblem(file, entry.line, 'commande CLI absente de la référence générée', entry.command)
    return true
  }

  const spec = cliReference.get(commandPath)
  const args = rest.slice(commandPath.split(' ').length)
  const usedFlags = new Set()
  const positionals = []
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }
    const [name, inlineValue] = token.slice(2).split('=', 2)
    const flag = spec.flags.get(name)
    if (!flag) {
      addProblem(file, entry.line, `option --${name} absente de la commande ${commandPath}`, entry.command)
      continue
    }
    usedFlags.add(name)
    if (flag.isBoolean) {
      if (inlineValue === undefined && ['true', 'false'].includes(args[index + 1]))
        addProblem(file, entry.line, `booléen non canonique : utiliser --${name} sans valeur pour true`, entry.command)
      continue
    }
    const value = inlineValue ?? args[index + 1]
    if (!value || value.startsWith('--')) {
      addProblem(file, entry.line, `valeur manquante pour --${name}`, entry.command)
      continue
    }
    if (inlineValue === undefined)
      index += 1
    if (flag.options.length && !flag.options.includes(value))
      addProblem(file, entry.line, `valeur ${value} invalide pour --${name}; attendu : ${flag.options.join(', ')}`, entry.command)
  }

  if (positionals.length < spec.requiredPositionals.length)
    addProblem(file, entry.line, `argument positionnel requis manquant pour ${commandPath}`, entry.command)

  for (const [name, flag] of spec.flags) {
    if (flag.required && !usedFlags.has(name)) {
      const aliases = [...spec.flags.entries()].filter(([, candidate]) => candidate === flag).map(([alias]) => alias)
      if (!aliases.some(alias => usedFlags.has(alias)))
        addProblem(file, entry.line, `option requise manquante pour ${commandPath} : --${name}`, entry.command)
    }
  }
  return true
}

function validatePackageScript(file, entry) {
  const match = entry.command.match(/\bbun run\s+([\w:.-]+)/)
  if (!match)
    return false
  stats.packageScripts += 1
  const script = match[1]
  const relativeFile = relative(docsRoot, file).replaceAll('\\', '/')
  const starterContext = relativeFile.includes('starter-quasar-unocss-pinia') || relativeFile.includes('starter-real-world-integration')
  const available = starterContext ? starterScripts : rootScripts
  if (!available.has(script)) {
    addProblem(
      file,
      entry.line,
      `script ${script} absent de ${starterContext ? 'examples/nfz-quasar-unocss-pinia-starter/package.json' : 'package.json'}`,
      entry.command,
    )
  }
  return true
}

function validateExternalCommand(file, entry) {
  const command = entry.command.trim()
  if (/^[A-Z][A-Z0-9_]*=/.test(command) || /^\$env:[A-Z][A-Z0-9_]*\s*=/.test(command))
    return

  const tokens = shellSplit(command)
  const first = tokens[0] || ''
  if (first === 'bun') {
    const operation = tokens[1] || ''
    if (!['add', 'dev', 'install', 'upgrade', '--version'].includes(operation))
      addProblem(file, entry.line, `commande Bun non reconnue dans la documentation : bun ${operation}`, entry.command)
    return
  }
  if (first === 'bunx') {
    const binary = tokens[1] || ''
    if (!/^nuxi(?:@[^\s]+)?$/.test(binary))
      addProblem(file, entry.line, `binaire bunx non audité : ${binary}`, entry.command)
    return
  }
  if (['Copy-Item', 'cd', 'cp', 'curl', 'curl.exe', 'docker', 'git', 'node', 'npm', 'npx', 'pnpm', 'yarn'].includes(first))
    return

  addProblem(file, entry.line, `commande shell non classée : ${first || '<vide>'}`, entry.command)
}

for (const file of walkMarkdown(docsRoot)) {
  stats.markdownFiles += 1
  for (const entry of extractCommands(file)) {
    stats.commands += 1
    if (validateCliCommand(file, entry))
      continue
    if (validatePackageScript(file, entry))
      continue
    stats.externalCommands += 1
    validateExternalCommand(file, entry)
  }
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Public documentation command audit failed:')
  for (const problem of problems) {
    console.error(`- ${problem}`)
  }
  process.exit(1)
}

console.log(
  `[nuxt-feathers-zod] Public documentation commands OK: ${stats.markdownFiles} pages, ${stats.commands} command references, ${stats.cliCommands} CLI commands, ${stats.packageScripts} package scripts, ${stats.externalCommands} external/runtime commands.`,
)
