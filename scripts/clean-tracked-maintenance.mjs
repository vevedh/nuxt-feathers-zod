import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const allowMissingGit = process.argv.includes('--if-git')

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

function normalizePath(path) {
  return path.split('\\').join('/')
}

function isMaintenanceArtifact(repositoryPath) {
  const normalized = normalizePath(repositoryPath)
  const segments = normalized.split('/')
  const fileName = basename(normalized)

  return forbiddenExactPaths.has(normalized)
    || segments.some(segment => forbiddenDirectoryNames.has(segment))
    || forbiddenFilePrefixes.some(prefix => fileName.startsWith(prefix))
}

if (!existsSync(resolve(rootDir, '.git'))) {
  if (allowMissingGit) {
    console.log('[nuxt-feathers-zod] Git metadata was not found; maintenance-index cleanup skipped.')
    process.exit(0)
  }

  console.error('[nuxt-feathers-zod] Git metadata was not found. This cleanup only applies to a Git working tree.')
  process.exit(1)
}

let trackedFiles
try {
  trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\0')
    .map(normalizePath)
    .filter(Boolean)
}
catch (error) {
  console.error(`[nuxt-feathers-zod] Unable to inspect tracked Git files: ${error.message}`)
  process.exit(1)
}

const trackedMaintenance = trackedFiles.filter(isMaintenanceArtifact)

if (!trackedMaintenance.length) {
  console.log('[nuxt-feathers-zod] No tracked local maintenance artifacts were found.')
  process.exit(0)
}

for (const repositoryPath of trackedMaintenance) {
  execFileSync('git', ['rm', '--cached', '--ignore-unmatch', '--', repositoryPath], {
    cwd: rootDir,
    stdio: 'inherit',
  })
}

console.log(`[nuxt-feathers-zod] Removed ${trackedMaintenance.length} maintenance artifact(s) from the Git index.`)
console.log('[nuxt-feathers-zod] Local files were preserved on disk and remain covered by .gitignore.')
console.log('[nuxt-feathers-zod] Review the staged removals with: git status --short')
