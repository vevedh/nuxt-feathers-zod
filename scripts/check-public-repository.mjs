import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, relative, resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const skippedDirectories = new Set([
  '.git',
  '.nuxt',
  '.nitro',
  '.output',
  'dist',
  'node_modules',
  'release-artifacts',
])

const forbiddenExactPaths = new Set([
  'AGENTS.md',
  '.coderabbit.yaml',
  '.vscode/mcp.json',
])

const forbiddenDirectoryNames = new Set([
  'patch-memory',
])

const forbiddenFilePrefixes = [
  'ANALYSE_',
  'VALIDATIONS_',
  'INVENTAIRE_PATCH_',
  'PATCH_',
  'PROMPT_',
  'CONTEXT_',
]

const problems = []

function normalizePath(path) {
  return path.split('\\').join('/')
}

function collectFilesystemFiles(directory, files = []) {
  for (const name of readdirSync(directory)) {
    if (skippedDirectories.has(name))
      continue

    const fullPath = resolve(directory, name)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      collectFilesystemFiles(fullPath, files)
      continue
    }

    files.push(normalizePath(relative(rootDir, fullPath)))
  }

  return files
}

function collectPublicFiles() {
  if (!existsSync(resolve(rootDir, '.git')))
    return collectFilesystemFiles(rootDir)

  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return output
      .split('\0')
      .map(normalizePath)
      .filter(Boolean)
  }
  catch (error) {
    console.error(`[nuxt-feathers-zod] Unable to inspect tracked Git files: ${error.message}`)
    process.exit(1)
  }
}

for (const repositoryPath of collectPublicFiles()) {
  const segments = repositoryPath.split('/')
  const fileName = basename(repositoryPath)

  if (segments.some(segment => forbiddenDirectoryNames.has(segment)))
    problems.push(`${repositoryPath} belongs to a local maintenance directory`)

  if (forbiddenExactPaths.has(repositoryPath))
    problems.push(`${repositoryPath} must stay outside the public repository`)

  if (forbiddenFilePrefixes.some(prefix => fileName.startsWith(prefix)))
    problems.push(`${repositoryPath} is an internal maintenance artifact`)
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Public repository hygiene check failed:')
  for (const problem of [...new Set(problems)].slice(0, 100))
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Public repository tree contains only publishable project material.')
