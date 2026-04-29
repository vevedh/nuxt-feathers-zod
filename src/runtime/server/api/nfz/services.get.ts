import { defineEventHandler } from 'h3'
import { getNfzApiContext } from '../../utils/nfzApiContext'
import { listServices } from '../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const { projectRoot, servicesDirs } = getNfzApiContext(event)

  return {
    projectRoot,
    servicesDirs,
    services: listServices(projectRoot, servicesDirs),
  }
})
