import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const guard = resolve(projectRoot, 'scripts/check-release-git-sync.mjs')
const tempRoot = mkdtempSync(join(tmpdir(), 'nfz-release-git-sync-'))
const remote = join(tempRoot, 'remote.git')
const work = join(tempRoot, 'work')

function run(command, args, cwd, env = process.env) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', env, shell: false, timeout: 20_000 })
}

function must(command, args, cwd) {
  const result = run(command, args, cwd)
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  return String(result.stdout || '').trim()
}

function guardRun(args = [], env = {}) {
  return run(process.execPath, [guard, '--root', work, ...args], projectRoot, { ...process.env, ...env })
}

function expectStatus(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(`${label}: expected exit ${expected}, got ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  }
}

try {
  must('git', ['init', '--bare', remote], tempRoot)
  must('git', ['init', '-b', 'main', work], tempRoot)
  must('git', ['config', 'user.email', 'nfz-release@example.invalid'], work)
  must('git', ['config', 'user.name', 'NFZ Release Guard'], work)
  must('git', ['remote', 'add', 'origin', remote], work)
  writeFileSync(join(work, 'package.json'), `${JSON.stringify({ name: 'nuxt-feathers-zod', version: '6.7.51' }, null, 2)}\n`)
  writeFileSync(join(work, 'tracked.txt'), 'baseline\n')
  must('git', ['add', '.'], work)
  must('git', ['commit', '-m', 'baseline'], work)
  must('git', ['push', '-u', 'origin', 'main'], work)

  expectStatus(guardRun(), 0, 'synchronized main')

  writeFileSync(join(work, 'tracked.txt'), 'dirty\n')
  expectStatus(guardRun(), 1, 'dirty tree rejection')
  must('git', ['restore', 'tracked.txt'], work)

  writeFileSync(join(work, 'tracked.txt'), 'ahead\n')
  must('git', ['add', 'tracked.txt'], work)
  must('git', ['commit', '-m', 'ahead'], work)
  expectStatus(guardRun(), 1, 'unpushed main rejection')
  must('git', ['push', 'origin', 'main'], work)
  expectStatus(guardRun(), 0, 'pushed main accepted')

  must('git', ['tag', 'v6.7.51'], work)
  expectStatus(guardRun(), 1, 'local tag rejection in preparation mode')
  must('git', ['push', 'origin', 'v6.7.51'], work)
  expectStatus(guardRun(['--tagged'], { NFZ_RELEASE_TAG: 'v6.7.51' }), 0, 'tagged publication accepted')

  writeFileSync(join(work, 'tracked.txt'), 'main-after-tag\n')
  must('git', ['add', 'tracked.txt'], work)
  must('git', ['commit', '-m', 'main-after-tag'], work)
  must('git', ['push', 'origin', 'main'], work)
  must('git', ['checkout', '--detach', 'v6.7.51'], work)
  expectStatus(guardRun(['--tagged'], { NFZ_RELEASE_TAG: 'v6.7.51' }), 0, 'tagged commit remains contained in advanced main')

  writeFileSync(join(work, 'package.json'), readFileSync(join(work, 'package.json'), 'utf8').replace('6.7.51', '6.7.52'))
  must('git', ['add', 'package.json'], work)
  must('git', ['commit', '-m', 'detached-wrong-version'], work)
  expectStatus(guardRun(['--tagged'], { NFZ_RELEASE_TAG: 'v6.7.52' }), 1, 'tag-only source rejection')

  console.log('[release-git] Synchronization regression smoke passed: dirty/ahead/tag-only source rejected; synchronized main/tag accepted.')
}
finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
