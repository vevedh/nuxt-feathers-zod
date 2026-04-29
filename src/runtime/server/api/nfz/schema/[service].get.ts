import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getServiceInfo } from '../../../utils/nfzSchema'
import { getNfzApiContext } from '../../../utils/nfzApiContext'

export default defineEventHandler((event) => {
  const service = getRouterParam(event, 'service')
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing :service param' })

  const { projectRoot, servicesDirs } = getNfzApiContext(event)
  return getServiceInfo(projectRoot, servicesDirs, service)
})
