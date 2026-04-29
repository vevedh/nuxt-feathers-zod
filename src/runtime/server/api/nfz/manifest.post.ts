import { createError, defineEventHandler, readBody } from 'h3'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertNfzConsoleWriteAllowed } from '../../utils/nfzApiContext'
import { getNfzDir } from '../../utils/nfzPaths'

export default defineEventHandler(async (event) => {
  const { projectRoot, servicesDirs } = assertNfzConsoleWriteAllowed(event)
  const body = await readBody(event) as any
  const manifest = body?.manifest && typeof body.manifest === 'object'
    ? body.manifest
    : body && typeof body === 'object' && body.services
      ? body
      : null

  if (!manifest)
    throw createError({ statusCode: 400, message: 'Body.manifest or body.services is required' })

  if (!manifest.services || typeof manifest.services !== 'object')
    manifest.services = {}

  const nfzDir = getNfzDir(projectRoot, servicesDirs)
  if (!existsSync(nfzDir))
    mkdirSync(nfzDir, { recursive: true })

  const manifestPath = join(nfzDir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

  return {
    ok: true,
    projectRoot,
    servicesDirs,
    manifestPath,
    manifest,
  }
})
