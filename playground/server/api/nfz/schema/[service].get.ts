import { defineEventHandler, getRouterParam } from 'h3'
import { findProjectRoot, getServiceInfo } from '../../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const service = getRouterParam(event, 'service')
  if (!service) throw new Error('Missing :service param')

  const projectRoot = findProjectRoot(process.cwd())
  const info = getServiceInfo(projectRoot, 'services', service)

  return info
})
