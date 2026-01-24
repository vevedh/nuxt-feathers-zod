import type { Import } from 'unimport'
import type { ServicesDirs } from './options/services'
import { addImports, addServerImports } from '@nuxt/kit'
import { scanDirExports } from 'unimport'

export async function getServicesImports(servicesDirs: ServicesDirs): Promise<Import[]> {
  const exports = await scanDirExports(servicesDirs, {
    filePatterns: ['**/*.schema.ts'],
  })
  const typeExports = exports.filter(({ type }) => type)
  console.log('Services typeExports', typeExports.map(({ as }) => as))
  return typeExports
}

export async function addServicesImports(imports: Import[]) {
  addImports(imports)
  addServerImports(imports)
}
