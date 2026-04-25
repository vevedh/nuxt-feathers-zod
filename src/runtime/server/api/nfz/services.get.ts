import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { findProjectRoot, listServices } from '../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const rc = useRuntimeConfig(event)

  // Prefer explicit console.servicesDirs, else feathers.servicesDirs, else default
  const feathersDirs: string[] = rc?._feathers?.servicesDirs ?? []
  const consoleDirs: string[] = rc?._feathers?.console?.servicesDirs ?? []
  const servicesDirs: string[] = (consoleDirs.length ? consoleDirs : (feathersDirs.length ? feathersDirs : ['services']))

  const projectRoot = findProjectRoot(process.cwd())
  return {
    projectRoot,
    servicesDirs,
    services: listServices(projectRoot, servicesDirs),
  }
})
