import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateService, runCli } from '../src/cli/index'

const root = process.cwd()
const ignoredMarkdownDirectories = new Set([
  '.nuxt',
  '.output',
  '.vitepress',
  'dist',
  'node_modules',
])

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('public documentation command contracts', () => {
  it('audits every public shell command against the CLI reference and package scripts', () => {
    const output = execFileSync(process.execPath, ['scripts/check-public-doc-commands.mjs'], {
      cwd: root,
      encoding: 'utf8',
    })

    expect(output).toContain('Public documentation commands OK')
    expect(output).toContain('127 pages')
  })

  it('keeps the command audit before artifact creation without making prepack heavy', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

    expect(pkg.scripts['docs:check-commands']).toBe('node scripts/check-public-doc-commands.mjs')
    expect(pkg.scripts['docs:build']).toContain('bun run docs:check-commands')
    expect(pkg.scripts['docs:dev']).toContain('bun run docs:check-commands')
    expect(pkg.scripts.prepack).toBe('node scripts/check-prepack-ready.mjs')
    expect(pkg.scripts.prepack).not.toContain('docs:check-commands')
    expect(pkg.scripts.prepack).not.toContain('bun run build')
    expect(pkg.scripts.prepack).not.toContain('bun run test')
    expect(pkg.scripts['release:check']).toContain('bun run docs:check-commands')
    expect(pkg.scripts['verify:sanity']).toContain('bun run docs:check-commands')
    expect(pkg.scripts['release:candidate']).toBe('node scripts/pack-release.mjs')
    expect(pkg.scripts['release:finalize']).toBe('node scripts/finalize-release.mjs')

    const publicationGuard = read('scripts/check-publication-pipeline.mjs')
    expect(publicationGuard).toContain(`prepack: 'node scripts/check-prepack-ready.mjs'`)
    expect(publicationGuard).toContain('must not run another Bun script after finalization')

    const auditSource = read('scripts/check-public-doc-commands.mjs')
    expect(auditSource).toContain('ignoredMarkdownDirectories')
    expect(auditSource).toContain(`'node_modules'`)
    expect(auditSource).toContain('\\$env:')
  })

  it('uses canonical boolean flags and self-contained MongoDB startup commands', () => {
    const publicDocs = [
      'docs/guide/file-upload-download.md',
      'docs/guide/services.md',
      'docs/en/guide/services.md',
      'docs/guide/swagger.md',
      'docs/en/guide/swagger.md',
      'docs/reference/mongodb-management.md',
      'docs/en/reference/mongodb-management.md',
      'docs/guide/real-world-nuxt4-quasar-app.md',
      'docs/en/guide/real-world-nuxt4-quasar-app.md',
    ].map(read).join('\n')

    expect(publicDocs).not.toMatch(/--(?:auth|docs|enabled|swagger)\s+true\b/)
    expect(publicDocs).not.toContain('bun run mongo:up')
    expect(publicDocs).toContain('docker compose up -d mongodb')
  })

  it('executes every unique NFZ CLI example in an isolated dry-run fixture', { timeout: 120_000 }, async () => {
    async function markdownFiles(directory: string): Promise<string[]> {
      const output: string[] = []
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name)
        if (entry.isDirectory()) {
          if (ignoredMarkdownDirectories.has(entry.name))
            continue
          output.push(...await markdownFiles(fullPath))
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
          output.push(fullPath)
        }
      }
      return output
    }

    function splitShell(command: string): string[] {
      const tokens: string[] = []
      let current = ''
      let quote = ''
      for (let index = 0; index < command.length; index += 1) {
        const char = command[index]
        if (quote) {
          if (char === quote)
            quote = ''
          else
            current += char
          continue
        }
        if (char === '"' || char === '\'') {
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

    function extractCliExamples(markdown: string): string[] {
      const output: string[] = []
      const lines = markdown.split(/\r?\n/)
      let inShellFence = false
      let current = ''
      for (const line of lines) {
        const marker = line.match(/^```(\S*)/)
        if (marker) {
          if (!inShellFence)
            inShellFence = ['bash', 'sh', 'shell', 'powershell', 'ps1', 'cmd', 'console'].includes(marker[1].toLowerCase())
          else
            inShellFence = false
          continue
        }
        if (!inShellFence)
          continue
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#'))
          continue
        current = current ? `${current} ${trimmed}` : trimmed
        if (/[\\`]$/.test(current)) {
          current = current.slice(0, -1).trim()
          continue
        }
        if (/\bbunx\s+nuxt-feathers-zod(?:@\S+)?\b/.test(current))
          output.push(current)
        current = ''
      }
      return output
    }

    const examples = new Set<string>()
    for (const file of await markdownFiles(resolve(root, 'docs'))) {
      for (const command of extractCliExamples(await readFile(file, 'utf8'))) {
        examples.add(command)
      }
    }

    expect(examples.size).toBeGreaterThan(30)

    for (const command of examples) {
      const tokens = splitShell(command)
      const binaryIndex = tokens.findIndex(token => /^nuxt-feathers-zod(?:@\S+)?$/.test(token))
      const argv = tokens.slice(binaryIndex + 1)
      const fixture = await mkdtemp(join(tmpdir(), 'nfz-public-doc-command-'))
      await writeFile(join(fixture, 'package.json'), JSON.stringify({ name: 'nfz-doc-command-fixture', private: true, type: 'module' }, null, 2))
      await writeFile(join(fixture, 'nuxt.config.ts'), 'export default defineNuxtConfig({ modules: ["nuxt-feathers-zod"], feathers: {} })\n')

      const commandPath = argv.slice(0, 2).join(' ')
      const needsServiceFixture = argv[0] === 'schema' || commandPath === 'auth service'
      const serviceName = needsServiceFixture
        ? (argv.includes('articles') ? 'articles' : argv.includes('users') ? 'users' : '')
        : ''
      if (serviceName) {
        await generateService({
          projectRoot: fixture,
          servicesDir: join(fixture, 'services'),
          name: serviceName,
          adapter: 'memory',
          auth: serviceName === 'users',
          idField: 'id',
          docs: false,
          schema: 'zod',
          dry: false,
          force: false,
        })
      }
      if (command.includes('schema articles --rename-field title:headline')) {
        await runCli(['schema', 'articles', '--add-field', 'title:string!'], { cwd: fixture, throwOnError: true })
      }

      const supportsDry = argv[0] !== '--help'
        && argv[0] !== 'capabilities'
        && argv[0] !== 'doctor'
        && commandPath !== 'templates list'
      if (supportsDry && !argv.includes('--dry')) {
        argv.push('--dry')
      }

      if (argv[0] === '--help') {
        const output = execFileSync(process.execPath, [resolve(root, 'bin/nuxt-feathers-zod'), ...argv], {
          cwd: fixture,
          encoding: 'utf8',
        })
        expect(output, command).toContain('USAGE')
        continue
      }

      await expect(runCli(argv, { cwd: fixture, throwOnError: true }), command).resolves.toBeUndefined()
    }
  })
})
