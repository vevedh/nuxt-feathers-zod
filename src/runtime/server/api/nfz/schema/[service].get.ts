import { useRuntimeConfig } from '#imports'
import { defineEventHandler, getRouterParam } from 'h3'
import { findProjectRoot, getServiceInfo } from '../../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const service = getRouterParam(event, 'service')
  if (!service)
    throw new Error('Missing :service param')

  const rc = useRuntimeConfig()
  const feathersDirs: string[] = rc?._feathers?.servicesDirs ?? []
  const consoleDirs: string[] = rc?._feathers?.console?.servicesDirs ?? []
  const servicesDirs: string[] = (consoleDirs.length ? consoleDirs : (feathersDirs.length ? feathersDirs : ['services']))

  const projectRoot = findProjectRoot(process.cwd())
  const info = getServiceInfo(projectRoot, servicesDirs, service)

  return info
})
