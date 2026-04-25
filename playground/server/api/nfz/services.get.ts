import { defineEventHandler } from 'h3'
import { findProjectRoot, listServices } from '../../utils/nfzSchema'

export default defineEventHandler((event) => {
  const projectRoot = findProjectRoot(process.cwd())
  return {
    projectRoot,
    services: listServices(projectRoot),
  }
})
