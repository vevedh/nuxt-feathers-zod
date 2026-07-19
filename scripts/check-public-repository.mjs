import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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
  'PATCHLOG.md',
  'PRODUCTION_AUDIT.md',
  'REPO_DEV.md',
  'RELEASE_CHECKLIST.md',
  'TODO.md',
  '.coderabbit.yaml',
  '.vscode/mcp.json',
])

const forbiddenDirectoryNames = new Set([
  'patch-memory',
  'docs-private',
])

const forbiddenFilePrefixes = [
  'ANALYSE_',
  'VALIDATIONS_',
  'INVENTAIRE_PATCH_',
  'RELEASE_NOTES_',
  'PATCH_',
  'PROMPT_',
  'CONTEXT_',
]

const problems = []

function readGitIgnorePatterns() {
  const gitIgnorePath = resolve(rootDir, '.gitignore')
  if (!existsSync(gitIgnorePath))
    return new Set()

  return new Set(
    readFileSync(gitIgnorePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('!')),
  )
}

const gitIgnorePatterns = readGitIgnorePatterns()

function isExplicitlyIgnoredMaintenancePath(repositoryPath) {
  const segments = repositoryPath.split('/')
  const fileName = basename(repositoryPath)

  if (segments.includes('patch-memory') && gitIgnorePatterns.has('patch-memory/'))
    return true

  if (segments.includes('docs-private') && gitIgnorePatterns.has('docs-private/'))
    return true

  if (repositoryPath === 'AGENTS.md' && gitIgnorePatterns.has('AGENTS.md'))
    return true

  if (forbiddenExactPaths.has(repositoryPath) && gitIgnorePatterns.has(repositoryPath))
    return true

  if (fileName.startsWith('ANALYSE_') && gitIgnorePatterns.has('ANALYSE_*.md'))
    return true

  if (fileName.startsWith('VALIDATIONS_') && gitIgnorePatterns.has('VALIDATIONS_*.md'))
    return true

  if (fileName.startsWith('INVENTAIRE_PATCH_') && gitIgnorePatterns.has('INVENTAIRE_PATCH_*.md'))
    return true

  if (fileName.startsWith('RELEASE_NOTES_') && gitIgnorePatterns.has('RELEASE_NOTES_*.md'))
    return true

  if (fileName.startsWith('PATCH_') && gitIgnorePatterns.has('**/PATCH_*.md'))
    return true

  return false
}

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
  if (!existsSync(resolve(rootDir, '.git'))) {
    return collectFilesystemFiles(rootDir)
      .filter(repositoryPath => !isExplicitlyIgnoredMaintenancePath(repositoryPath))
  }

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

  if (existsSync(resolve(rootDir, '.git'))) {
    console.error('[nuxt-feathers-zod] These paths are still tracked by Git.')
    console.error('[nuxt-feathers-zod] Run: bun run repo:clean-maintenance-index')
    console.error('[nuxt-feathers-zod] The cleanup removes matching paths from the Git index and keeps local files on disk.')
  }

  process.exit(1)
}

console.log('[nuxt-feathers-zod] Public repository boundary contains only publishable project material.')
