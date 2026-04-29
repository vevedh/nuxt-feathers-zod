export type RbacMethod = 'find' | 'get' | 'create' | 'update' | 'patch' | 'remove'

export type RbacPolicies = Record<string, Partial<Record<RbacMethod, string[]>>>

export interface RbacFile {
  enabled: boolean
  denyByDefault: boolean
  roles: string[]
  policies: RbacPolicies
  updatedAt?: string
}
