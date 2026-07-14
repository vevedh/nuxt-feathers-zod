import type { Import } from 'unimport'
import type { ServicesDirs } from './options/services'

import { addImports, addServerImports } from '@nuxt/kit'

import { discoverSchemaTypes } from './discovery'

export async function getServicesImports(servicesDirs: ServicesDirs): Promise<Import[]> {
  return discoverSchemaTypes(servicesDirs)
}

export async function addServicesImports(imports: Import[]) {
  addImports(imports)
  addServerImports(imports)
}
