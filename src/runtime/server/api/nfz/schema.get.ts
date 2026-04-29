import { createError, defineEventHandler, getQuery } from 'h3'
import { getServiceInfo } from '../../utils/nfzSchema'
import { getNfzApiContext } from '../../utils/nfzApiContext'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const service = String(query.service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing query parameter: service' })

  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  return getServiceInfo(projectRoot, servicesDirs, service)
})
