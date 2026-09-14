export type Adapter = 'mongodb' | 'memory' | 'knex'
export type ServiceDatabaseType = 'mongodb' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite'
export type ServiceDatabaseProvider = 'mongodb' | 'knex'
export type ServiceDatabaseFamily = 'document' | 'sql'
export type SchemaKind = 'none' | 'zod' | 'json'
export type MiddlewareTarget = 'nitro' | 'route' | 'feathers' | 'server-module' | 'module' | 'client-module' | 'hook' | 'policy'
export type IdField = 'id' | '_id'
export type ServiceIdStrategy = 'objectid' | 'uuid' | 'integer' | 'bigint' | 'string'
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
  idStrategy?: ServiceIdStrategy
  collectionName?: string
  tableName?: string
  schemaName?: string
  connectionName?: string
  databaseType?: ServiceDatabaseType
  databaseProvider?: ServiceDatabaseProvider
  databaseFamily?: ServiceDatabaseFamily
  methods?: string[]
  customMethods?: string[]
  schema: {
    mode: SchemaKind
    fields: Record<string, ServiceSchemaField>
  }
}
