import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

export function loadReleaseContract(rootDir = process.cwd()) {
  const root = resolve(rootDir)
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const version = String(pkg.version || '').trim()

  if (!semverPattern.test(version))
    throw new Error(`Invalid package version: ${version || '<missing>'}`)

  return Object.freeze({
    name: String(pkg.name || ''),
    version,
    tag: `v${version}`,
    packageManager: String(pkg.packageManager || ''),
    nativeCache: Object.freeze({
      enabledByDefault: false,
      providers: Object.freeze(['memory', 'redis']),
      serverOnly: true,
      distributed: true,
    }),
    databases: Object.freeze(['mongodb', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql']),
  })
}
