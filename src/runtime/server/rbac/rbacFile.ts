import type { RbacFile } from './types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getNfzDir } from '../utils/nfzPaths'

export function defaultRbacFile(): RbacFile {
  return {
    enabled: false,
    denyByDefault: true,
    roles: ['admin', 'editor', 'reader'],
    policies: {},
    updatedAt: new Date().toISOString(),
  }
}

export function getRbacPath(projectRoot: string, servicesDirs?: string[]) {
  const nfzDir = getNfzDir(projectRoot, servicesDirs)
  return join(nfzDir, 'rbac.json')
}

export function readRbacFile(projectRoot: string, servicesDirs?: string[]): RbacFile {
  const p = getRbacPath(projectRoot, servicesDirs)
  if (!existsSync(p))
    return defaultRbacFile()
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    return {
      ...defaultRbacFile(),
      ...parsed,
      policies: parsed?.policies && typeof parsed.policies === 'object' ? parsed.policies : {},
    } satisfies RbacFile
  }
  catch {
    return defaultRbacFile()
  }
}

export function writeRbacFile(projectRoot: string, servicesDirs: string[] | undefined, next: RbacFile) {
  const p = getRbacPath(projectRoot, servicesDirs)
  const file: RbacFile = {
    ...defaultRbacFile(),
    ...next,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(p, `${JSON.stringify(file, null, 2)}\n`, 'utf-8')
  return { path: p, file }
}
