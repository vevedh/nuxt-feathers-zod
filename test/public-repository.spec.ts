import { execFileSync, spawnSync } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const checkerPath = resolve('scripts/check-public-repository.mjs')
const cleanupPath = resolve('scripts/clean-tracked-maintenance.mjs')
const temporaryDirectories: string[] = []

async function createRepository(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'nfz-public-repository-'))
  temporaryDirectories.push(directory)

  await writeFile(
    join(directory, '.gitignore'),
    [
      'patch-memory/',
      'AGENTS.md',
      'ANALYSE_*.md',
      'VALIDATIONS_*.md',
      'INVENTAIRE_PATCH_*.md',
      'RELEASE_NOTES_*.md',
      '**/PATCH_*.md',
      '',
    ].join('\n'),
  )
  await writeFile(join(directory, 'README.md'), '# Public project\n')

  execFileSync('git', ['init', '-q'], { cwd: directory })
  execFileSync('git', ['add', '.'], { cwd: directory })

  return directory
}

function runChecker(directory: string) {
  return spawnSync(process.execPath, [checkerPath], {
    cwd: directory,
    encoding: 'utf8',
  })
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async directory => rm(directory, { recursive: true, force: true })),
  )
})

describe('public repository hygiene guard', () => {
  it('allows ignored local maintenance files to remain on the workstation', async () => {
    const directory = await createRepository()
    await mkdir(join(directory, 'patch-memory', 'entries'), { recursive: true })
    await writeFile(join(directory, 'patch-memory', 'entries', 'local.md'), '# Local note\n')
    await writeFile(join(directory, 'AGENTS.md'), '# Local maintenance\n')

    const result = runChecker(directory)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('only publishable project material')
  })

  it('allows explicitly ignored maintenance files in an extracted workspace without Git metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nfz-public-workspace-'))
    temporaryDirectories.push(directory)

    await writeFile(
      join(directory, '.gitignore'),
      ['RELEASE_NOTES_*.md', 'patch-memory/', 'AGENTS.md', ''].join('\n'),
    )
    await writeFile(join(directory, 'README.md'), '# Extracted project\n')
    await writeFile(join(directory, 'RELEASE_NOTES_6.5.32.md'), '# Local release note\n')
    await mkdir(join(directory, 'patch-memory'), { recursive: true })
    await writeFile(join(directory, 'patch-memory', '000-index.md'), '# Local maintenance\n')

    const result = runChecker(directory)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('only publishable project material')
  })

  it('rejects a local maintenance file when it is forced into the Git index', async () => {
    const directory = await createRepository()
    await writeFile(join(directory, 'AGENTS.md'), '# Local maintenance\n')
    execFileSync('git', ['add', '-f', 'AGENTS.md'], { cwd: directory })

    const result = runChecker(directory)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('AGENTS.md must stay outside the public repository')
    expect(result.stderr).toContain('bun run repo:clean-maintenance-index')
  })

  it('removes tracked maintenance artifacts from the Git index without deleting local files', async () => {
    const directory = await createRepository()
    const releaseNotes = join(directory, 'RELEASE_NOTES_6.5.32.md')
    await writeFile(releaseNotes, '# Local release note\n')
    execFileSync('git', ['add', '-f', 'RELEASE_NOTES_6.5.32.md'], { cwd: directory })

    const cleanup = spawnSync(process.execPath, [cleanupPath], {
      cwd: directory,
      encoding: 'utf8',
    })

    expect(cleanup.status).toBe(0)
    expect(cleanup.stdout).toContain('Removed 1 maintenance artifact(s) from the Git index')
    expect(execFileSync('git', ['ls-files', 'RELEASE_NOTES_6.5.32.md'], { cwd: directory, encoding: 'utf8' })).toBe('')
    await expect(access(releaseNotes)).resolves.toBeUndefined()
    expect(runChecker(directory).status).toBe(0)
  })
})
