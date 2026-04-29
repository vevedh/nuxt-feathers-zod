import { defineEventHandler } from 'h3'
import { readManifest } from '../../utils/nfzSchema'
import { getNfzApiContext } from '../../utils/nfzApiContext'

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
