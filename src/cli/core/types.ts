export type Adapter = 'mongodb' | 'memory'
export type SchemaKind = 'none' | 'zod' | 'json'
export type MiddlewareTarget = 'nitro' | 'route' | 'feathers' | 'server-module' | 'module' | 'client-module' | 'hook' | 'policy'
export type IdField = 'id' | '_id'
export type CollectionName = string

export interface RunCliOptions {
  cwd?: string
  throwOnError?: boolean
}

export interface ServiceSchemaField {
  type: string
  required?: boolean
  default?: string | number | boolean | null
  secret?: boolean
}

export interface ServiceManifest {
  name: string
  path: string
  adapter: Adapter
  auth: boolean
  custom?: boolean
  authAware?: boolean
  idField?: IdField
  collectionName?: string
  methods?: string[]
  customMethods?: string[]
  schema: {
    mode: SchemaKind
    fields: Record<string, ServiceSchemaField>
  }
}
