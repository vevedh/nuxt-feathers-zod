import { existsSync } from 'node:fs'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { generateMiddleware, generateService } from '../src/cli/index'

describe('nuxt-feathers-zod CLI generators', () => {
  it('generates a mongodb service (4 files)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'posts',
      adapter: 'mongodb',
      auth: true,
      idField: '_id',
      docs: false,
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'posts')
    const schemaFile = join(base, 'posts.schema.ts')
    const classFile = join(base, 'posts.class.ts')
    const sharedFile = join(base, 'posts.shared.ts')
    const svcFile = join(base, 'posts.ts')

    expect(existsSync(schemaFile)).toBe(true)
    expect(existsSync(classFile)).toBe(true)
    expect(existsSync(sharedFile)).toBe(true)
    expect(existsSync(svcFile)).toBe(true)

    const svc = await readFile(svcFile, 'utf8')
    expect(svc).toContain('authenticate(\'jwt\')')
    expect(svc).toContain('export function post')
  })

  it('supports --path, --idField, --docs and --collection', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'users',
      adapter: 'mongodb',
      auth: true,
      idField: 'id',
      servicePath: 'accounts',
      collectionName: 'users',
      docs: true,
      dry: false,
      force: false,
    })

    const base = join(servicesDir, 'users')
    const sharedFile = join(base, 'users.shared.ts')
    const schemaFile = join(base, 'users.schema.ts')
    const classFile = join(base, 'users.class.ts')
    const svcFile = join(base, 'users.ts')

    const shared = await readFile(sharedFile, 'utf8')
    expect(shared).toContain('export const userPath = \'accounts\'')

    const schema = await readFile(schemaFile, 'utf8')
    expect(schema).toContain('id: objectIdSchema()')

    const klass = await readFile(classFile, 'utf8')
    expect(klass).toContain('db.collection(\'users\')')

    const svc = await readFile(svcFile, 'utf8')
    expect(svc).toContain('docs:')
  })


  it('generates an adapter-less service via generateService --custom', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))
    const servicesDir = join(root, 'services')

    await generateService({
      projectRoot: root,
      servicesDir,
      name: 'actions',
      adapter: 'memory',
      auth: true,
      idField: 'id',
      docs: false,
      schema: 'none',
      dry: false,
      force: false,
      custom: true,
      methods: 'find',
      customMethods: 'run,preview',
    })

    const base = join(servicesDir, 'actions')
    const classFile = join(base, 'actions.class.ts')
    const sharedFile = join(base, 'actions.shared.ts')
    const svcFile = join(base, 'actions.ts')
    const hooksFile = join(base, 'actions.hooks.ts')

    expect(existsSync(classFile)).toBe(true)
    expect(existsSync(sharedFile)).toBe(true)
    expect(existsSync(svcFile)).toBe(true)
    expect(existsSync(hooksFile)).toBe(true)

    const klass = await readFile(classFile, 'utf8')
    expect(klass).toContain('async run')
    expect(klass).toContain('async preview')

    const shared = await readFile(sharedFile, 'utf8')
    expect(shared).toContain('methods: ['find', 'run', 'preview']')
  })

  it('generates a Nitro middleware', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-'))

    await generateMiddleware({
      projectRoot: root,
      name: 'session',
      target: 'nitro',
      dry: false,
      force: false,
    })

    const file = join(root, 'server', 'middleware', 'session.ts')
    expect(existsSync(file)).toBe(true)
    const txt = await readFile(file, 'utf8')
    expect(txt).toContain('defineEventHandler')
  })
})
