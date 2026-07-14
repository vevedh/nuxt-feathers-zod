import type { Import } from 'unimport'
import path from 'node:path'
import { camelCase } from 'change-case'
import { hash } from 'ohash'

export function filterExports({ name, from, as }: Import) {
  return name === 'default'
    || new RegExp(`^${as}\w{0,2}`).test(camelCase(path.basename(from, path.extname(from))))
}

export interface ModuleImport extends Import {
  meta: {
    importId: string
    import: string
  }
}

export function getImportId(p: string) {
  return `_${hash(p).replace(/-/g, '').slice(0, 8)}`
}

export function setImportMeta(module: Import): ModuleImport {
  const importId = getImportId(module.from)
  const _import = module.name === 'default' ? importId : `{ ${module.as} as ${importId} }`
  const _from = module.from.replace(/.ts$/, '')

  module.meta = {
    importId,
    import: `import ${_import} from '${_from}'`,
  }
  return module as ModuleImport
}

export function setImportsMeta(modules: Import[]): ModuleImport[] {
  return modules.map(setImportMeta)
}
