import { defineEventHandler } from 'h3'
import { getNfzApiContext } from '../../utils/nfzApiContext'
import { readManifest } from '../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  const { manifest, manifestPath } = readManifest(projectRoot, servicesDirs)

  return {
    ok: true,
    projectRoot,
    servicesDirs,
    manifestPath,
    manifest: manifest || { services: {} },
  }
})
