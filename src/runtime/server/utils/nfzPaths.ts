import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { findProjectRoot } from './nfzSchema'

export function resolveServicesDirs(projectRoot: string, servicesDirs: string[] | undefined) {
  const dirs = (servicesDirs && servicesDirs.length) ? servicesDirs : ['services']
  return dirs.map((d) => {
    // Support absolute paths (POSIX/Windows) and UNC paths on Windows
    if (isAbsolute(d) || d.startsWith('\\\\')) return d
    return join(projectRoot, d)
  })
}

export function getNfzDir(projectRoot: string, servicesDirs: string[] | undefined) {
  const dirsAbs = resolveServicesDirs(projectRoot, servicesDirs)
  const base = dirsAbs[0] || join(projectRoot, 'services')
  const nfzDir = join(base, '.nfz')
  if (!existsSync(nfzDir)) mkdirSync(nfzDir, { recursive: true })
  return nfzDir
}

export function getProjectRootFromNuxt(nuxtRootDir: string | undefined) {
  return findProjectRoot(nuxtRootDir || process.cwd())
}

export function resolveProjectFile(projectRoot: string, p: string) {
  if (!p) return ''
  if (isAbsolute(p) || p.startsWith('\\\\')) return p
  return resolve(projectRoot, p)
}
