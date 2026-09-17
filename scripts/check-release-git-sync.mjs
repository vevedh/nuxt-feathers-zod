import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const tagged = argv.includes('--tagged')
const rootIndex = argv.indexOf('--root')
const defaultRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const rootDir = rootIndex >= 0 ? resolve(argv[rootIndex + 1] || '') : defaultRoot
const timeoutMs = Number.parseInt(process.env.NFZ_RELEASE_GIT_TIMEOUT_MS || '30000', 10)

function fail(message) {
  console.error(`[release-git] ${message}`)
  process.exit(1)
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
  })
  if (result.error) {
    if (allowFailure)
      return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' }
    fail(`Unable to execute git ${args.join(' ')}: ${result.error.message}`)
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || '').trim()
    fail(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
  return {
    status: result.status ?? 0,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  }
}

if (!rootDir || !existsSync(resolve(rootDir, 'package.json')))
  fail(`Release root is invalid: ${rootDir || '(empty)'}`)

const inside = git(['rev-parse', '--is-inside-work-tree'], { allowFailure: true })
if (inside.status !== 0 || inside.stdout !== 'true')
  fail('Publishing requires a Git-backed checkout; extracted archives are validation inputs, not publication sources.')

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const version = String(pkg.version || '').trim()
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
  fail(`Invalid package version: ${version || '(missing)'}`)
const expectedTag = `v${version}`

const status = git(['status', '--porcelain=v1', '--untracked-files=all']).stdout
if (status) {
  const preview = status.split(/\r?\n/).slice(0, 12).join('\n')
  fail(`Working tree must be clean before publication. Commit or remove these changes:\n${preview}`)
}

const originUrl = git(['remote', 'get-url', 'origin'], { allowFailure: true })
if (originUrl.status !== 0 || !originUrl.stdout)
  fail('Missing Git remote "origin". Publication must be tied to the canonical repository.')

const headSha = git(['rev-parse', 'HEAD']).stdout.toLowerCase()
const remoteMainResult = git(['ls-remote', '--heads', 'origin', 'refs/heads/main'])
const remoteMainLine = remoteMainResult.stdout.split(/\r?\n/).find(Boolean)
if (!remoteMainLine)
  fail('Remote branch origin/main was not found.')
const remoteMainSha = remoteMainLine.split(/\s+/)[0].toLowerCase()

function resolveRemoteTagSha() {
  const result = git(['ls-remote', '--tags', 'origin', `refs/tags/${expectedTag}`, `refs/tags/${expectedTag}^{}`])
  if (!result.stdout)
    return null
  const lines = result.stdout.split(/\r?\n/).filter(Boolean)
  const peeled = lines.find(line => line.endsWith(`refs/tags/${expectedTag}^{}`))
  const direct = lines.find(line => line.endsWith(`refs/tags/${expectedTag}`))
  const chosen = peeled || direct
  return chosen ? chosen.split(/\s+/)[0].toLowerCase() : null
}

const remoteTagSha = resolveRemoteTagSha()

if (!tagged) {
  const branch = git(['branch', '--show-current']).stdout
  if (branch !== 'main')
    fail(`Release preparation must run from branch main, current branch is ${branch || '(detached HEAD)'}.`)
  if (headSha !== remoteMainSha)
    fail(`Local HEAD ${headSha} is not synchronized with origin/main ${remoteMainSha}. Push main before creating ${expectedTag}.`)

  const localTag = git(['tag', '--list', expectedTag]).stdout
  if (localTag || remoteTagSha)
    fail(`Release tag ${expectedTag} already exists locally or on origin; refuse to create/publish an ambiguous release.`)

  console.log(`[release-git] Publication source is synchronized: main=${headSha} tag=${expectedTag} absent.`)
  process.exit(0)
}

const suppliedTag = String(process.env.GITHUB_REF_NAME || process.env.NFZ_RELEASE_TAG || '').trim()
if (suppliedTag && suppliedTag !== expectedTag)
  fail(`Tagged publication mismatch: received ${suppliedTag}, expected ${expectedTag}.`)
if (!remoteTagSha)
  fail(`Remote release tag ${expectedTag} does not exist. Push the synchronized main commit first, then create and push the tag.`)
if (remoteTagSha !== headSha)
  fail(`Remote tag ${expectedTag} resolves to ${remoteTagSha}, but checkout HEAD is ${headSha}.`)

const remoteMainObject = git(['cat-file', '-e', `${remoteMainSha}^{commit}`], { allowFailure: true })
if (remoteMainObject.status !== 0)
  fail('origin/main commit is not present locally. Publication checkout must fetch full history (actions/checkout fetch-depth: 0).')
const ancestor = git(['merge-base', '--is-ancestor', headSha, remoteMainSha], { allowFailure: true })
if (ancestor.status !== 0)
  fail(`Tagged commit ${headSha} is not contained in origin/main ${remoteMainSha}. Push main before tagging; do not publish tag-only source.`)

console.log(`[release-git] Tagged publication source is synchronized: tag=${expectedTag} sha=${headSha} contained-in-main=${remoteMainSha}.`)
