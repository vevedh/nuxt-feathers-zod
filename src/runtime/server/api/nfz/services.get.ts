import { defineEventHandler } from 'h3'
import { listServices } from '../../utils/nfzSchema'
import { getNfzApiContext } from '../../utils/nfzApiContext'

export default defineEventHandler((event) => {
  const { projectRoot, servicesDirs } = getNfzApiContext(event)

  return {
    projectRoot,
    servicesDirs,
    services: listServices(projectRoot, servicesDirs),
  }
})
